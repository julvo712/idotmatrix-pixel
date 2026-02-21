import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..device_manager import device_manager
from .upload import RESIZE_MODE_MAP, process_gif, send_gif_to_device

from idotmatrix.util.image_utils import ResizeMode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/giphy")

GIPHY_API_URL = "https://api.giphy.com/v1/gifs/search"


def _require_api_key() -> str:
    if not settings.GIPHY_API_KEY:
        raise HTTPException(status_code=503, detail="GIPHY_API_KEY is not configured")
    return settings.GIPHY_API_KEY


class GiphySearchResult(BaseModel):
    id: str
    title: str
    preview_url: str
    original_url: str


class GiphySearchResponse(BaseModel):
    results: list[GiphySearchResult]


class GiphySendRequest(BaseModel):
    query: str
    resize_mode: str = "fill"
    crop_x: float = 0.5
    crop_y: float = 0.5


class GiphySendUrlRequest(BaseModel):
    url: str
    resize_mode: str = "fill"
    crop_x: float = 0.5
    crop_y: float = 0.5


async def _search_giphy(api_key: str, query: str, limit: int = 24) -> list[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(GIPHY_API_URL, params={
            "api_key": api_key,
            "q": query,
            "limit": limit,
            "rating": "g",
        })
        resp.raise_for_status()
        return resp.json()["data"]


async def _download_gif(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


def _parse_giphy_results(data: list[dict]) -> list[GiphySearchResult]:
    results = []
    for item in data:
        images = item.get("images", {})
        preview = images.get("fixed_height", {}).get("url", "")
        original = images.get("original", {}).get("url", "")
        if preview and original:
            results.append(GiphySearchResult(
                id=item["id"],
                title=item.get("title", ""),
                preview_url=preview,
                original_url=original,
            ))
    return results


async def _process_and_send(gif_bytes: bytes, resize_mode: str, crop_x: float, crop_y: float) -> None:
    mode = RESIZE_MODE_MAP.get(resize_mode, ResizeMode.FILL)
    canvas_size = device_manager.screen_size
    gif_data = process_gif(gif_bytes, canvas_size, mode, crop_x, crop_y)
    logger.info("Giphy GIF processed: %d bytes, sending to device...", len(gif_data))
    await send_gif_to_device(gif_data)


@router.get("/search")
async def search(q: str, limit: int = 24) -> GiphySearchResponse:
    api_key = _require_api_key()
    data = await _search_giphy(api_key, q, limit)
    return GiphySearchResponse(results=_parse_giphy_results(data))


@router.post("/send")
async def send(req: GiphySendRequest) -> dict:
    api_key = _require_api_key()
    data = await _search_giphy(api_key, req.query, limit=1)
    if not data:
        raise HTTPException(status_code=404, detail="No GIFs found for query")
    original_url = data[0].get("images", {}).get("original", {}).get("url", "")
    if not original_url:
        raise HTTPException(status_code=404, detail="No downloadable GIF found")
    gif_bytes = await _download_gif(original_url)
    await _process_and_send(gif_bytes, req.resize_mode, req.crop_x, req.crop_y)
    return {"ok": True}


@router.post("/send-url")
async def send_url(req: GiphySendUrlRequest) -> dict:
    _require_api_key()
    gif_bytes = await _download_gif(req.url)
    await _process_and_send(gif_bytes, req.resize_mode, req.crop_x, req.crop_y)
    return {"ok": True}
