import asyncio
import logging

from idotmatrix.client import IDotMatrixClient
from idotmatrix.connection_manager import ConnectionManager, ConnectionListener
from idotmatrix.screensize import ScreenSize

from .config import settings

logger = logging.getLogger(__name__)

SCREEN_SIZE_MAP = {
    16: ScreenSize.SIZE_16x16,
    32: ScreenSize.SIZE_32x32,
    64: ScreenSize.SIZE_64x64,
}


class DeviceManager:
    def __init__(self) -> None:
        self._client: IDotMatrixClient | None = None
        self._screen_size = settings.SCREEN_SIZE
        self._connection_lock = asyncio.Lock()
        self._send_lock = asyncio.Lock()
        self._connected = False

    def _ensure_client(self) -> IDotMatrixClient:
        if self._client is None:
            screen_size = SCREEN_SIZE_MAP.get(settings.SCREEN_SIZE, ScreenSize.SIZE_64x64)
            self._client = IDotMatrixClient(
                screen_size=screen_size,
                mac_address=settings.MAC_ADDRESS,
            )
            self._client.add_connection_listener(ConnectionListener(
                on_connected=self._on_connected,
                on_disconnected=self._on_disconnected,
            ))
            if settings.AUTO_RECONNECT:
                self._client.set_auto_reconnect(True)
        return self._client

    @property
    def client(self) -> IDotMatrixClient:
        return self._ensure_client()

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def screen_size(self) -> int:
        return self._screen_size

    @property
    def mac_address(self) -> str | None:
        if self._client is None:
            return settings.MAC_ADDRESS
        return self._client.mac_address

    async def _on_connected(self) -> None:
        self._connected = True
        logger.info("Device connected")

    async def _on_disconnected(self) -> None:
        self._connected = False
        logger.info("Device disconnected")

    async def scan(self) -> list[str]:
        return await ConnectionManager.discover_devices()

    async def connect(self, mac_address: str | None = None, screen_size: int | None = None) -> None:
        async with self._connection_lock:
            client = self._ensure_client()

            if screen_size and screen_size in SCREEN_SIZE_MAP:
                self._screen_size = screen_size
                client.screen_size = SCREEN_SIZE_MAP[screen_size]

            if mac_address:
                client.mac_address = mac_address
                client._connection_manager.set_address(mac_address)

            await client.connect()

    async def disconnect(self) -> None:
        async with self._connection_lock:
            if self._client and self._connected:
                await self._client.disconnect()

    async def send_bytes(self, data: bytes, with_response: bool = False) -> None:
        async with self._send_lock:
            await self.client._connection_manager.send_bytes(data, response=with_response)

    async def send_packets(self, packets: list[list[bytes]], with_response: bool = False) -> None:
        async with self._send_lock:
            await self.client._connection_manager.send_packets(packets, response=with_response)


device_manager = DeviceManager()
