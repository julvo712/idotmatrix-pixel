from fastapi import APIRouter

from ..device_manager import device_manager
from ..models import ConnectRequest, DeviceStatus, ScanResult

router = APIRouter(prefix="/api")


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/device/status")
async def status() -> DeviceStatus:
    return DeviceStatus(
        connected=device_manager.connected,
        reconnecting=device_manager.reconnecting,
        macAddress=device_manager.mac_address,
        screenSize=device_manager.screen_size,
    )


@router.post("/device/scan")
async def scan() -> ScanResult:
    devices = await device_manager.scan()
    return ScanResult(devices=devices)


@router.post("/device/connect")
async def connect(req: ConnectRequest | None = None) -> DeviceStatus:
    mac = req.macAddress if req else None
    size = req.screenSize if req else None
    await device_manager.connect(mac_address=mac, screen_size=size)
    return DeviceStatus(
        connected=device_manager.connected,
        reconnecting=device_manager.reconnecting,
        macAddress=device_manager.mac_address,
        screenSize=device_manager.screen_size,
    )


@router.post("/device/disconnect")
async def disconnect() -> DeviceStatus:
    await device_manager.disconnect()
    return DeviceStatus(
        connected=device_manager.connected,
        reconnecting=device_manager.reconnecting,
        macAddress=device_manager.mac_address,
        screenSize=device_manager.screen_size,
    )
