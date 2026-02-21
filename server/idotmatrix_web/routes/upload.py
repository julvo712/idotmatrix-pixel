import asyncio
import io
import logging

from fastapi import APIRouter, UploadFile, Form
from PIL import Image as PILImage, ImageOps

from idotmatrix.util.image_utils import ResizeMode

from ..device_manager import device_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

RESIZE_MODE_MAP = {
    "fit": ResizeMode.FIT,
    "fill": ResizeMode.FILL,
    "stretch": ResizeMode.STRETCH,
}


def _crop_and_resize_image(
    img: PILImage.Image,
    canvas_size: int,
    resize_mode: ResizeMode,
    crop_x: float,
    crop_y: float,
) -> PILImage.Image:
    """Resize and crop an image to canvas_size x canvas_size.

    For FILL mode with custom crop offsets: scale along the shorter side
    to canvas_size, then crop a canvas_size square at the given offset
    (0.0 = top/left, 0.5 = center, 1.0 = bottom/right).
    """
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")

    if resize_mode == ResizeMode.FILL:
        ratio = max(canvas_size / img.width, canvas_size / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), PILImage.Resampling.LANCZOS)

        max_x = new_w - canvas_size
        max_y = new_h - canvas_size
        left = int(max_x * crop_x)
        top = int(max_y * crop_y)
        img = img.crop((left, top, left + canvas_size, top + canvas_size))
    elif resize_mode == ResizeMode.STRETCH:
        img = img.resize((canvas_size, canvas_size), PILImage.Resampling.LANCZOS)
    else:  # FIT
        ratio = min(canvas_size / img.width, canvas_size / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), PILImage.Resampling.LANCZOS)
        bg = PILImage.new("RGB", (canvas_size, canvas_size), (0, 0, 0))
        bg.paste(img, ((canvas_size - new_w) // 2, (canvas_size - new_h) // 2))
        img = bg

    return img


@router.post("/upload/image")
async def upload_image(
    file: UploadFile,
    resize_mode: str = Form("fill"),
    crop_x: float = Form(0.5),
    crop_y: float = Form(0.5),
) -> dict:
    contents = await file.read()
    mode = RESIZE_MODE_MAP.get(resize_mode, ResizeMode.FILL)
    canvas_size = device_manager.screen_size

    with PILImage.open(io.BytesIO(contents)) as img:
        logger.info("Image upload: original %dx%d, resizing to %dx%d (mode=%s, crop=%.2f,%.2f)",
                     img.width, img.height, canvas_size, canvas_size, resize_mode, crop_x, crop_y)
        img = _crop_and_resize_image(img, canvas_size, mode, crop_x, crop_y)
        pixel_data = bytearray(img.tobytes())

    logger.info("Image data: %d bytes (%dx%d RGB), sending to device...",
                len(pixel_data), canvas_size, canvas_size)

    async with device_manager._send_lock:
        await device_manager.client.image.set_mode(1)
        await asyncio.sleep(0.3)
        await device_manager.client.image._send_diy_image_data(pixel_data)

    logger.info("Image upload complete")
    return {"ok": True}


@router.post("/upload/gif")
async def upload_gif(
    file: UploadFile,
    resize_mode: str = Form("fill"),
    crop_x: float = Form(0.5),
    crop_y: float = Form(0.5),
) -> dict:
    contents = await file.read()
    mode = RESIZE_MODE_MAP.get(resize_mode, ResizeMode.FILL)
    canvas_size = device_manager.screen_size

    gif_data = _process_gif(contents, canvas_size, mode, crop_x, crop_y)
    logger.info("GIF processed: %d bytes, sending to device...", len(gif_data))

    gif_module = device_manager.client.gif
    packets = gif_module.create_gif_data_packets(gif_data, gif_type=12, time_sign=1)

    async with device_manager._send_lock:
        await gif_module._send_packets(packets=packets, response=True)

    logger.info("GIF upload complete")
    return {"ok": True}


def _process_gif(
    contents: bytes,
    canvas_size: int,
    resize_mode: ResizeMode,
    crop_x: float,
    crop_y: float,
) -> bytes:
    """Load a GIF, resize/crop each frame, re-encode as GIF bytes."""
    from PIL import GifImagePlugin
    GifImagePlugin.LOADING_STRATEGY = GifImagePlugin.LoadingStrategy.RGB_AFTER_DIFFERENT_PALETTE_ONLY

    with PILImage.open(io.BytesIO(contents)) as img:
        logger.info("GIF upload: original %dx%d, %s frames",
                     img.width, img.height, getattr(img, 'n_frames', '?'))

        frames = []
        durations = []
        try:
            while True:
                frame = img.copy()
                duration = img.info.get("duration", 200)
                durations.append(duration if duration > 0 else 200)
                frames.append(frame)
                img.seek(img.tell() + 1)
        except EOFError:
            pass

        # Limit to 64 frames
        if len(frames) > 64:
            step = len(frames) / 64
            indices = [int(i * step) for i in range(64)]
            frames = [frames[i] for i in indices]
            durations = [durations[i] for i in indices]

        # Limit total animation duration to 2 seconds (device constraint)
        total_duration = sum(durations[:len(frames)])
        if total_duration > 2000 and len(frames) > 1:
            target_frames = max(2, int(2000 / max(durations[0], 16)))
            target_frames = min(target_frames, 64)
            if target_frames < len(frames):
                step = len(frames) / target_frames
                indices = [int(i * step) for i in range(target_frames)]
                frames = [frames[i] for i in indices]
                durations = [durations[i] for i in indices]

        # Resize/crop and palettize each frame
        processed = []
        for frame in frames:
            if frame.mode not in ("RGB", "RGBA"):
                frame = frame.convert("RGBA")
            frame = _crop_and_resize_frame(frame, canvas_size, resize_mode, crop_x, crop_y)
            # Palettize to 256 colors — critical for keeping GIF size small
            frame = frame.convert("P", palette=PILImage.Palette.ADAPTIVE, colors=256)
            processed.append(frame)

        logger.info("GIF: %d frames at %dx%d, re-encoding...", len(processed), canvas_size, canvas_size)

        # Re-encode as GIF
        buf = io.BytesIO()
        processed[0].save(
            buf,
            format="GIF",
            save_all=True,
            optimize=True,
            append_images=processed[1:],
            loop=0,
            duration=durations[:len(processed)],
            disposal=2,
        )
        buf.seek(0)
        gif_bytes = buf.getvalue()
        logger.info("GIF encoded: %d bytes (%.1f KB)", len(gif_bytes), len(gif_bytes) / 1024)
        return gif_bytes


def _crop_and_resize_frame(
    img: PILImage.Image,
    canvas_size: int,
    resize_mode: ResizeMode,
    crop_x: float,
    crop_y: float,
) -> PILImage.Image:
    """Resize/crop a single GIF frame. Uses NEAREST for pixel-art quality."""
    if resize_mode == ResizeMode.FILL:
        ratio = max(canvas_size / img.width, canvas_size / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), PILImage.Resampling.NEAREST)
        max_x = new_w - canvas_size
        max_y = new_h - canvas_size
        left = int(max_x * crop_x)
        top = int(max_y * crop_y)
        img = img.crop((left, top, left + canvas_size, top + canvas_size))
    elif resize_mode == ResizeMode.STRETCH:
        img = img.resize((canvas_size, canvas_size), PILImage.Resampling.NEAREST)
    else:  # FIT
        ratio = min(canvas_size / img.width, canvas_size / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), PILImage.Resampling.NEAREST)
        bg = PILImage.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 255))
        bg.paste(img, ((canvas_size - new_w) // 2, (canvas_size - new_h) // 2))
        img = bg

    return img
