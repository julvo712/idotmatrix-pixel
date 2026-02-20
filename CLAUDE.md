# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This workspace contains three related projects for controlling iDotMatrix pixel display devices (16x16, 32x32, 64x64) via Bluetooth:

- `idotmatrix-api-client/` — **Active project**: refactored modern library (Python 3.12+, Poetry)
- `python3-idotmatrix-library/` — Legacy library (original fork, largely superseded)
- `idotmatrix/` — Reverse-engineering documentation and protocol specs

## Primary Project: idotmatrix-api-client

### Setup & Commands

```bash
cd idotmatrix-api-client

# Install dependencies
poetry install --with test

# Run all tests
cd tests && pytest

# Run a single test file
cd tests && pytest test_image.py

# Lint (matches CI)
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

# Build package
poetry build
```

**Python version**: 3.12–3.13 (tested in CI via GitHub Actions at `.github/workflows/pythonpackage.yml`)

### Architecture

The library is async-first. Entry point is `IDotMatrixClient` in `idotmatrix/client.py`, which composes feature modules and delegates Bluetooth connection to `ConnectionManager`.

**Key files**:
- `idotmatrix/client.py` — `IDotMatrixClient`, main public API; instantiate with `ScreenSize` and optional MAC address
- `idotmatrix/connection_manager.py` — BLE scanning, connecting, auto-reconnect logic
- `idotmatrix/const.py` — Bluetooth UUIDs and protocol constants
- `idotmatrix/screensize.py` — `ScreenSize` enum (SIZE_16x16, SIZE_32x32, SIZE_64x64)
- `idotmatrix/digital_picture_frame.py` — Slideshow with file watching and auto-reconnect
- `idotmatrix/modules/__init__.py` — `IDotMatrixModule` base class with `_send_bytes()` / `_send_packets()`
- `idotmatrix/util/` — `color_utils.py`, `image_utils.py`, `file_watch.py`

**Module pattern**: every feature (text, clock, gif, image, etc.) lives in `idotmatrix/modules/` and inherits `IDotMatrixModule`. The base class handles low-level BLE byte transmission; modules encode device-specific bytecode commands.

**Bluetooth protocol**:
- Device name prefix: `IDM-`
- Write characteristic: `0000fa02-0000-1000-8000-00805f9b34fb`
- Notify characteristic: `0000fa03-0000-1000-8000-00805f9b34fb`
- Max packet size: 514 bytes; GIF uploads use 4 KB chunking with multi-packet headers

**Typical usage**:
```python
client = IDotMatrixClient(screen_size=ScreenSize.SIZE_64x64)
await client.connect()
await client.text.display_text("Hello World!")
await client.gif.upload_gif_file("./demo.gif")
```

### Protocol Documentation

For low-level protocol details (packet formats, byte decoding, text effects, GIF headers), see:
- `idotmatrix/readme.md`
- `idotmatrix/decoding_bytes.md`
