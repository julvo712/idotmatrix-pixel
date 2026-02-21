#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="idotmatrix-web"

echo "=== iDotMatrix Pixel Display — Install / Update ==="
echo "Repo: $REPO_DIR"
echo ""

# --- 1. System dependencies (first run only, skipped if present) ---
if ! command -v poetry &>/dev/null; then
    echo ">>> Installing Poetry..."
    pipx install poetry
fi

if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
    echo ">>> Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! dpkg -s bluetooth bluez &>/dev/null 2>&1; then
    echo ">>> Installing Bluetooth packages..."
    sudo apt install -y bluetooth bluez
fi

# --- 2. Pull latest code ---
echo ""
echo ">>> Pulling latest code..."
cd "$REPO_DIR"
git pull

# --- 3. Python library ---
echo ""
echo ">>> Installing idotmatrix-api-client..."
cd "$REPO_DIR/idotmatrix-api-client"
poetry lock --no-update
poetry install

# --- 4. Server ---
echo ""
echo ">>> Installing server..."
cd "$REPO_DIR/server"
poetry lock --no-update
poetry install

# --- 5. Frontend ---
echo ""
echo ">>> Building frontend..."
cd "$REPO_DIR/web"
npm install
npm run build

# --- 6. systemd service ---
echo ""
echo ">>> Updating systemd service..."
VENV_PATH=$(cd "$REPO_DIR/server" && poetry env info -p)

sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << UNIT
[Unit]
Description=iDotMatrix Web Server
After=network.target bluetooth.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${REPO_DIR}/server
ExecStart=${VENV_PATH}/bin/python -m idotmatrix_web.main
Restart=on-failure
RestartSec=5
Environment=IDOTMATRIX_PORT=8080
Environment=IDOTMATRIX_WEB_DIST_PATH=${REPO_DIR}/web/dist

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}

echo ""
echo "=== Done! ==="
echo "Service status:"
sudo systemctl status ${SERVICE_NAME} --no-pager
echo ""
echo "Logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo "URL:  http://$(hostname -I | awk '{print $1}'):8080"
