import base64

from fastapi import APIRouter

from ..device_manager import device_manager
from ..models import SendRequest, SendPacketsRequest

router = APIRouter(prefix="/api")


@router.post("/send")
async def send(req: SendRequest) -> dict:
    data = base64.b64decode(req.data)
    await device_manager.send_bytes(data, with_response=req.withResponse)
    return {"ok": True}


@router.post("/send-packets")
async def send_packets(req: SendPacketsRequest) -> dict:
    packets = [
        [base64.b64decode(chunk) for chunk in packet]
        for packet in req.packets
    ]
    await device_manager.send_packets(packets, with_response=req.withResponse)
    return {"ok": True}
