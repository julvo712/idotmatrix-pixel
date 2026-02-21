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
        self._reconnecting = False
        self._has_ever_connected = False
        self._auto_connect = settings.AUTO_CONNECT
        self._auto_connect_task: asyncio.Task | None = None

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
    def reconnecting(self) -> bool:
        return self._reconnecting

    @property
    def screen_size(self) -> int:
        return self._screen_size

    @property
    def mac_address(self) -> str | None:
        if self._client is None:
            return settings.MAC_ADDRESS
        return self._client.mac_address

    @property
    def auto_connect(self) -> bool:
        return self._auto_connect

    def set_auto_connect(self, enabled: bool) -> None:
        self._auto_connect = enabled
        if enabled and not self._connected:
            self.start_auto_connect()
        elif not enabled and self._auto_connect_task:
            self._auto_connect_task.cancel()
            self._auto_connect_task = None

    def start_auto_connect(self) -> None:
        """Start the auto-connect background loop if enabled."""
        if not self._auto_connect:
            return
        if self._auto_connect_task and not self._auto_connect_task.done():
            return  # already running
        self._auto_connect_task = asyncio.create_task(self._auto_connect_loop())

    async def _auto_connect_loop(self) -> None:
        """Background loop: keep trying to connect until successful."""
        retry_delay = 5
        while self._auto_connect and not self._connected:
            try:
                logger.info("Auto-connect: attempting to connect...")
                await self.connect()
                if self._connected:
                    logger.info("Auto-connect: connected successfully")
                    return
            except Exception as e:
                logger.warning("Auto-connect: failed (%s), retrying in %ds", e, retry_delay)
            await asyncio.sleep(retry_delay)

    async def _on_connected(self) -> None:
        self._connected = True
        self._reconnecting = False
        self._has_ever_connected = True
        logger.info("Device connected")

    async def _on_disconnected(self) -> None:
        was_connected = self._connected
        self._connected = False

        if was_connected and settings.AUTO_RECONNECT and self._has_ever_connected:
            self._reconnecting = True
            logger.info("Device disconnected — auto-reconnect active, will retry")
        elif was_connected and self._auto_connect:
            self._reconnecting = True
            logger.info("Device disconnected — auto-connect will retry")
            self.start_auto_connect()
        else:
            self._reconnecting = False
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

            self._reconnecting = False
            await client.connect()

    async def disconnect(self) -> None:
        async with self._connection_lock:
            self._reconnecting = False
            self._has_ever_connected = False
            # Stop auto-connect loop so it doesn't immediately reconnect
            if self._auto_connect_task:
                self._auto_connect_task.cancel()
                self._auto_connect_task = None
            if self._client:
                await self._client.disconnect()

    async def send_bytes(self, data: bytes, with_response: bool = False) -> None:
        async with self._send_lock:
            await self.client._connection_manager.send_bytes(data, response=with_response)

    async def send_packets(self, packets: list[list[bytes]], with_response: bool = False) -> None:
        async with self._send_lock:
            await self.client._connection_manager.send_packets(packets, response=with_response)


device_manager = DeviceManager()
