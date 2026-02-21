import io
import tempfile
from typing import Optional

from fastapi import APIRouter, UploadFile, Form
from PIL import Image as PILImage, ImageOps

from idotmatrix.util.image_utils import ResizeMode

from ..device_manager import device_manager

router = APIRouter(prefix="/api")

CANVAS_SIZE = 64

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

        # Apply crop offset (0.0–1.0)
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
        img = _crop_and_resize_image(img, canvas_size, mode, crop_x, crop_y)
        pixel_data = bytearray(img.tobytes())

    await device_manager.client.image.set_mode(1)
    await device_manager.client.image._send_diy_image_data(pixel_data)
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

    gif_module = device_manager.client.gif
    packets = gif_module.create_gif_data_packets(gif_data, gif_type=12, time_sign=1)
    await gif_module._send_packets(packets=packets, response=True)
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

        # Resize/crop each frame
        processed = []
        for frame in frames:
            if frame.mode not in ("RGB", "RGBA"):
                frame = frame.convert("RGBA")
            processed.append(
                _crop_and_resize_frame(frame, canvas_size, resize_mode, crop_x, crop_y)
            )

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
        return buf.getvalue()


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
