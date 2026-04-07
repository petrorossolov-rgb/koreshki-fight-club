#!/bin/bash
# Deploy Koreshki Fight Club server to VPS
# Usage: ssh user@host 'bash -s' < server/deploy.sh

set -e

REPO_URL="https://github.com/petrorossolov-rgb/koreshki-fight-club.git"
INSTALL_DIR="/opt/koreshki-fight-club"
SERVICE_NAME="koreshki-server"
USER="koreshki"

echo "=== Koreshki Fight Club — Server Deploy ==="

# Install Deno if missing
if ! su - "$USER" -c "/home/$USER/.deno/bin/deno --version" > /dev/null 2>&1; then
    echo "Installing Deno..."
    apt-get install -y -qq unzip > /dev/null 2>&1
    su - "$USER" -c "curl -fsSL https://deno.land/install.sh | sh"
fi

# Clone or update repo
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Updating repo..."
    su - "$USER" -c "cd $INSTALL_DIR && git pull"
else
    echo "Cloning repo..."
    mkdir -p "$INSTALL_DIR"
    chown "$USER:$USER" "$INSTALL_DIR"
    su - "$USER" -c "git clone $REPO_URL $INSTALL_DIR"
fi

# Install systemd service
cp "$INSTALL_DIR/server/koreshki-server.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "=== Deploy complete ==="
systemctl status "$SERVICE_NAME" --no-pager | head -10
