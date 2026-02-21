from pydantic import BaseModel


class ConnectRequest(BaseModel):
    macAddress: str | None = None
    screenSize: int | None = None


class SendRequest(BaseModel):
    data: str  # base64-encoded bytes
    withResponse: bool = False


class SendPacketsRequest(BaseModel):
    packets: list[list[str]]  # outer: packets, inner: base64-encoded BLE chunks
    withResponse: bool = False


class DeviceStatus(BaseModel):
    connected: bool
    reconnecting: bool = False
    macAddress: str | None = None
    screenSize: int


class ScanResult(BaseModel):
    devices: list[str]
