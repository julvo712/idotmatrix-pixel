# iDotMatrix Web Server API

Base URL: `http://localhost:8080`

## Device Management

### `GET /api/health`

Health check.

```bash
curl localhost:8080/api/health
```

Response: `{"status": "ok"}`

### `GET /api/device/status`

Get device connection status.

```bash
curl localhost:8080/api/device/status
```

Response:
```json
{
  "connected": true,
  "reconnecting": false,
  "autoConnect": true,
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "screenSize": 64
}
```

### `POST /api/device/scan`

Scan for nearby iDotMatrix devices via BLE.

```bash
curl -X POST localhost:8080/api/device/scan
```

Response:
```json
{"devices": ["AA:BB:CC:DD:EE:FF"]}
```

### `POST /api/device/connect`

Connect to a device. If no parameters are given, connects using configured defaults.

```bash
curl -X POST localhost:8080/api/device/connect \
  -H 'Content-Type: application/json' \
  -d '{"macAddress": "AA:BB:CC:DD:EE:FF", "screenSize": 64}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `macAddress` | string? | from config | BLE MAC address |
| `screenSize` | int? | from config | 16, 32, or 64 |

Response: `DeviceStatus` (same as `/api/device/status`).

### `POST /api/device/disconnect`

Disconnect from the device.

```bash
curl -X POST localhost:8080/api/device/disconnect
```

Response: `DeviceStatus`.

### `POST /api/device/auto-connect`

Enable or disable auto-connect.

```bash
curl -X POST localhost:8080/api/device/auto-connect \
  -H 'Content-Type: application/json' \
  -d '{"enabled": true}'
```

Response: `DeviceStatus`.

## Raw BLE Send

### `POST /api/send`

Send raw bytes to the device write characteristic.

```bash
curl -X POST localhost:8080/api/send \
  -H 'Content-Type: application/json' \
  -d '{"data": "BASE64_ENCODED_BYTES", "withResponse": false}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | string | required | Base64-encoded bytes |
| `withResponse` | bool | false | Wait for BLE write response |

### `POST /api/send-packets`

Send multiple BLE packets (each packet is a list of base64-encoded chunks).

```bash
curl -X POST localhost:8080/api/send-packets \
  -H 'Content-Type: application/json' \
  -d '{"packets": [["BASE64_CHUNK1", "BASE64_CHUNK2"]], "withResponse": false}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `packets` | string[][] | required | Outer: packets, inner: base64-encoded BLE chunks |
| `withResponse` | bool | false | Wait for BLE write response |

## Image Upload

### `POST /api/upload/image`

Upload a static image to display on the device.

```bash
curl -X POST localhost:8080/api/upload/image \
  -F file=@photo.png \
  -F resize_mode=fill \
  -F crop_x=0.5 \
  -F crop_y=0.5
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `file` | file | required | Image file (PNG, JPEG, etc.) |
| `resize_mode` | string | `"fill"` | `fit`, `fill`, or `stretch` |
| `crop_x` | float | 0.5 | Crop X offset for fill mode (0.0=left, 0.5=center, 1.0=right) |
| `crop_y` | float | 0.5 | Crop Y offset for fill mode (0.0=top, 0.5=center, 1.0=bottom) |

**Resize modes:**
- **fit** — Scale to fit within canvas, black bars on edges
- **fill** — Scale to fill canvas, crop overflow using `crop_x`/`crop_y` offsets
- **stretch** — Stretch to fill canvas exactly (distorts aspect ratio)

## GIF Upload

### `POST /api/upload/gif`

Upload a GIF to display on the device. The server processes the GIF before sending:
1. Limits to 64 frames (evenly sampled)
2. Caps total animation duration to 2 seconds (device constraint)
3. Resizes/crops each frame to canvas size
4. Palettizes each frame to 256 colors

```bash
curl -X POST localhost:8080/api/upload/gif \
  -F file=@animation.gif \
  -F resize_mode=fill \
  -F crop_x=0.5 \
  -F crop_y=0.5
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `file` | file | required | GIF file |
| `resize_mode` | string | `"fill"` | `fit`, `fill`, or `stretch` |
| `crop_x` | float | 0.5 | Crop X offset for fill mode |
| `crop_y` | float | 0.5 | Crop Y offset for fill mode |

## Giphy Integration

Requires `IDOTMATRIX_GIPHY_API_KEY` to be set. All endpoints return `503` if the key is not configured.

### `GET /api/giphy/search`

Search Giphy for GIFs.

```bash
curl 'localhost:8080/api/giphy/search?q=thumbs+up&limit=24'
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | required | Search query |
| `limit` | int | 24 | Max results (1-50) |

Response:
```json
{
  "results": [
    {
      "id": "abc123",
      "title": "Thumbs Up GIF",
      "preview_url": "https://media.giphy.com/.../200.gif",
      "original_url": "https://media.giphy.com/.../giphy.gif"
    }
  ]
}
```

### `POST /api/giphy/send`

Search Giphy, download the top result, process it, and send to the device. Useful for headless automation (e.g., Home Assistant).

```bash
curl -X POST localhost:8080/api/giphy/send \
  -H 'Content-Type: application/json' \
  -d '{"query": "thumbs up"}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | required | Giphy search query |
| `resize_mode` | string | `"fill"` | `fit`, `fill`, or `stretch` |
| `crop_x` | float | 0.5 | Crop X offset for fill mode |
| `crop_y` | float | 0.5 | Crop Y offset for fill mode |

### `POST /api/giphy/send-url`

Download a specific GIF URL, process it, and send to the device. Used by the frontend after a user selects a search result.

```bash
curl -X POST localhost:8080/api/giphy/send-url \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://media.giphy.com/.../giphy.gif"}'
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | required | Direct GIF URL to download |
| `resize_mode` | string | `"fill"` | `fit`, `fill`, or `stretch` |
| `crop_x` | float | 0.5 | Crop X offset for fill mode |
| `crop_y` | float | 0.5 | Crop Y offset for fill mode |

## Configuration

All settings are configured via environment variables with the `IDOTMATRIX_` prefix.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `IDOTMATRIX_MAC_ADDRESS` | string | none | BLE MAC address of the device |
| `IDOTMATRIX_SCREEN_SIZE` | int | 64 | Screen size: 16, 32, or 64 |
| `IDOTMATRIX_HOST` | string | `0.0.0.0` | Server bind address |
| `IDOTMATRIX_PORT` | int | 8080 | Server port |
| `IDOTMATRIX_WEB_DIST_PATH` | string | `../web/dist` | Path to frontend build |
| `IDOTMATRIX_LOG_LEVEL` | string | `INFO` | Logging level |
| `IDOTMATRIX_AUTO_RECONNECT` | bool | true | Auto-reconnect on disconnect |
| `IDOTMATRIX_AUTO_CONNECT` | bool | true | Auto-connect on server startup |
| `IDOTMATRIX_GIPHY_API_KEY` | string | none | Giphy API key for search/send endpoints |

### Systemd setup

```bash
echo 'Environment=IDOTMATRIX_GIPHY_API_KEY=your_key_here' | sudo tee -a /etc/systemd/system/idotmatrix-web.service.d/override.conf
sudo systemctl daemon-reload && sudo systemctl restart idotmatrix-web
```
