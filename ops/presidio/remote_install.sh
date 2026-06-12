#!/bin/bash
# =============================================================================
# Remote install script — Presidio Alxor PII API
# Run directly on the server:
#   curl -fsSL https://raw.githubusercontent.com/Nels72/alxor-os-1/main/ops/presidio/remote_install.sh | sudo bash
# =============================================================================

set -e

INSTALL_DIR="/opt/presidio-alxor"
VENV_DIR="$INSTALL_DIR/venv"
SERVICE_NAME="presidio-alxor"
PORT=5080
GITHUB_RAW="https://raw.githubusercontent.com/Nels72/alxor-os-1/main/ops/presidio"

echo "==========================================="
echo "  Presidio Alxor — Installation distante"
echo "==========================================="

# [1] Dépendances système
echo ""
echo "[1/7] Dépendances système..."
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq python3 python3-pip python3-venv curl 2>/dev/null || true

PYTHON=$(command -v python3 || echo "")
if [ -z "$PYTHON" ]; then
    echo "ERREUR : python3 introuvable"
    exit 1
fi
echo "  python3 : $($PYTHON --version)"

# [2] Répertoire d'installation
echo ""
echo "[2/7] Création du répertoire $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

# [3] Téléchargement des fichiers depuis GitHub
echo ""
echo "[3/7] Téléchargement des fichiers depuis GitHub..."
curl -fsSL "$GITHUB_RAW/presidio_api.py"        -o "$INSTALL_DIR/presidio_api.py"
curl -fsSL "$GITHUB_RAW/requirements.txt"        -o "$INSTALL_DIR/requirements.txt"
curl -fsSL "$GITHUB_RAW/recognizers_fr.yaml"     -o "$INSTALL_DIR/recognizers_fr.yaml" 2>/dev/null || true
echo "  presidio_api.py   : $(wc -l < $INSTALL_DIR/presidio_api.py) lignes"
echo "  requirements.txt  : $(cat $INSTALL_DIR/requirements.txt)"

# [4] Environnement virtuel Python
echo ""
echo "[4/7] Création du venv Python..."
$PYTHON -m venv "$VENV_DIR"

# [5] Installation des paquets Python
echo ""
echo "[5/7] Installation des paquets Python (2-5 min)..."
"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install presidio-analyzer presidio-anonymizer flask gunicorn spacy -q
echo "  paquets installés"

# [6] Modèle spaCy français
echo ""
echo "[6/7] Téléchargement du modèle spaCy fr_core_news_md (~46 MB)..."
"$VENV_DIR/bin/python" -m spacy download fr_core_news_md
echo "  modèle ok"

# [7] Service systemd (ou script de démarrage simple si systemd indisponible)
echo ""
echo "[7/7] Configuration du service..."

if command -v systemctl &>/dev/null && systemctl --version &>/dev/null 2>&1; then
    cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Presidio Alxor PII Anonymization API
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
Environment=PRESIDIO_PORT=$PORT
Environment=PRESIDIO_HOST=127.0.0.1
Environment=PRESIDIO_LOG_LEVEL=INFO
ExecStart=$VENV_DIR/bin/gunicorn --bind 127.0.0.1:$PORT --workers 2 --timeout 120 presidio_api:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"
    echo "  service systemd démarré"
else
    # Fallback : script de démarrage simple
    cat > "$INSTALL_DIR/start.sh" <<EOF
#!/bin/bash
cd $INSTALL_DIR
PRESIDIO_PORT=$PORT PRESIDIO_HOST=127.0.0.1 \\
  $VENV_DIR/bin/gunicorn --bind 127.0.0.1:$PORT --workers 2 --timeout 120 \\
  --daemon --pid /tmp/presidio-alxor.pid \\
  presidio_api:app
echo "Presidio démarré sur port $PORT (PID: \$(cat /tmp/presidio-alxor.pid))"
EOF
    chmod +x "$INSTALL_DIR/start.sh"
    "$INSTALL_DIR/start.sh"
    echo "  démarré via start.sh (pas de systemd)"
fi

# Health check
echo ""
echo "Vérification de l'API (30s max)..."
for i in $(seq 1 6); do
    sleep 5
    if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
        echo ""
        echo "==========================================="
        echo "  PRESIDIO OPERATIONNEL sur port $PORT"
        echo "==========================================="
        curl -s "http://127.0.0.1:$PORT/health"
        echo ""
        echo ""
        echo "Test rapide :"
        echo "  curl -s -X POST http://127.0.0.1:$PORT/analyze \\"
        echo "    -H 'Content-Type: application/json' \\"
        echo "    -d '{\"text\":\"Jean Dupont, né le 15/03/1985\",\"language\":\"fr\"}'"
        exit 0
    fi
    echo "  tentative $i/6..."
done

echo "API non encore prête. Vérifier :"
echo "  systemctl status $SERVICE_NAME"
echo "  journalctl -u $SERVICE_NAME -n 50"
