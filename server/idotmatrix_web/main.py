import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .device_manager import device_manager
from .routes import device, send, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    logging.getLogger(__name__).info(
        "iDotMatrix Web Server starting on %s:%d", settings.HOST, settings.PORT
    )
    # Start auto-connect background loop if enabled
    device_manager.start_auto_connect()
    yield
    # Disconnect on shutdown
    if device_manager.connected:
        await device_manager.disconnect()


app = FastAPI(title="iDotMatrix Web Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(device.router)
app.include_router(send.router)
app.include_router(upload.router)

# Mount static files last so API routes take priority
dist_path = Path(settings.WEB_DIST_PATH)
if dist_path.is_dir():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")


if __name__ == "__main__":
    uvicorn.run(
        "idotmatrix_web.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
