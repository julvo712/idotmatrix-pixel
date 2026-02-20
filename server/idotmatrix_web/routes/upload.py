import tempfile

from fastapi import APIRouter, UploadFile

from ..device_manager import device_manager

router = APIRouter(prefix="/api")


@router.post("/upload/image")
async def upload_image(file: UploadFile) -> dict:
    contents = await file.read()
    with tempfile.NamedTemporaryFile(suffix=_suffix(file.filename)) as tmp:
        tmp.write(contents)
        tmp.flush()
        await device_manager.client.image.set_mode(1)
        await device_manager.client.image.upload_image_file(tmp.name)
    return {"ok": True}


@router.post("/upload/gif")
async def upload_gif(file: UploadFile) -> dict:
    contents = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".gif") as tmp:
        tmp.write(contents)
        tmp.flush()
        await device_manager.client.gif.upload_gif_file(tmp.name)
    return {"ok": True}


def _suffix(filename: str | None) -> str:
    if filename and "." in filename:
        return "." + filename.rsplit(".", 1)[1]
    return ".png"
