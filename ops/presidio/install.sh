#!/bin/bash
# =============================================================================
# Installation script for Presidio Alxor API
# Run on the n8n server (n8n2.reaktimo.com)
# =============================================================================

set -e

echo "=========================================="
echo " Presidio Alxor - Installation"
echo "=========================================="

# Configuration
INSTALL_DIR="/opt/presidio-alxor"
VENV_DIR="$INSTALL_DIR/venv"
SERVICE_NAME="presidio-alxor"
PORT=5080

# 1. System dependencies
echo "[1/6] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-pip python3-venv

# 2. Create install directory
echo "[2/6] Creating install directory..."
sudo mkdir -p "$INSTALL_DIR"
sudo chown "$USER:$USER" "$INSTALL_DIR"

# Copy files
cp presidio_api.py "$INSTALL_DIR/"
cp recognizers_fr.yaml "$INSTALL_DIR/"
cp requirements.txt "$INSTALL_DIR/"
cp test_presidio.py "$INSTALL_DIR/"

# 3. Create virtual environment
echo "[3/6] Creating Python virtual environment..."
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

# 4. Install Python packages
echo "[4/6] Installing Python packages (this may take a few minutes)..."
pip install --upgrade pip -q
pip install -r "$INSTALL_DIR/requirements.txt" -q

# 5. Download spaCy French model
echo "[5/6] Downloading spaCy French model (fr_core_news_lg ~500MB)..."
python -m spacy download fr_core_news_lg -q

# Optional: English model for mixed content
echo "Downloading spaCy English model (en_core_web_lg ~560MB)..."
python -m spacy download en_core_web_lg -q || {
    echo "WARNING: en_core_web_lg failed, trying en_core_web_sm..."
    python -m spacy download en_core_web_sm -q
}

deactivate

# 6. Create systemd service
echo "[6/6] Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Presidio Alxor PII Anonymization API
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment=PRESIDIO_PORT=$PORT
Environment=PRESIDIO_HOST=127.0.0.1
Environment=PRESIDIO_LOG_LEVEL=INFO
Environment=PRESIDIO_SCORE_THRESHOLD=0.4
ExecStart=$VENV_DIR/bin/gunicorn \
    --bind 127.0.0.1:$PORT \
    --workers 2 \
    --timeout 120 \
    --access-logfile /var/log/presidio-alxor/access.log \
    --error-logfile /var/log/presidio-alxor/error.log \
    presidio_api:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
sudo mkdir -p /var/log/presidio-alxor
sudo chown "$USER:$USER" /var/log/presidio-alxor

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

echo ""
echo "=========================================="
echo " Installation complete!"
echo "=========================================="
echo ""
echo " Service: ${SERVICE_NAME}"
echo " Port:    ${PORT}"
echo " Status:  sudo systemctl status ${SERVICE_NAME}"
echo " Logs:    sudo journalctl -u ${SERVICE_NAME} -f"
echo " Test:    curl http://127.0.0.1:${PORT}/health"
echo ""
echo " Next: run test_presidio.py to verify"
echo "   cd $INSTALL_DIR && $VENV_DIR/bin/python test_presidio.py"
echo ""
