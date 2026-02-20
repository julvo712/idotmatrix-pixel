# iDotMatrix Web Server

A FastAPI server that proxies BLE commands to iDotMatrix pixel displays and serves the web frontend.

## Quick Start

```bash
# Install dependencies
poetry install

# Build the frontend
cd ../web && npm run build && cd ../server

# Run the server
IDOTMATRIX_WEB_DIST_PATH=../web/dist poetry run python -m idotmatrix_web.main
```

The server starts on `http://0.0.0.0:8080` by default.

## Configuration

All settings use the `IDOTMATRIX_` prefix as environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `IDOTMATRIX_MAC_ADDRESS` | *(auto-discover)* | BLE MAC address of the device |
| `IDOTMATRIX_SCREEN_SIZE` | `64` | Screen size: 16, 32, or 64 |
| `IDOTMATRIX_HOST` | `0.0.0.0` | Server bind address |
| `IDOTMATRIX_PORT` | `8080` | Server port |
| `IDOTMATRIX_WEB_DIST_PATH` | `../web/dist` | Path to built frontend |
| `IDOTMATRIX_LOG_LEVEL` | `INFO` | Logging level |
| `IDOTMATRIX_AUTO_RECONNECT` | `true` | Auto-reconnect on BLE disconnect |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (frontend auto-detect) |
| GET | `/api/device/status` | Connection state |
| POST | `/api/device/scan` | BLE scan, returns MAC list |
| POST | `/api/device/connect` | Connect to device |
| POST | `/api/device/disconnect` | Disconnect |
| POST | `/api/send` | Forward raw bytes (base64) |
| POST | `/api/send-packets` | Multi-packet forward (base64) |
| POST | `/api/upload/image` | Image upload with server-side resize |
| POST | `/api/upload/gif` | GIF upload with server-side processing |

## systemd Deployment

```bash
sudo cp idotmatrix-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now idotmatrix-web
```
