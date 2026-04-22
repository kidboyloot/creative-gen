#!/usr/bin/env bash
# One-shot deploy for the Creative Gen stack on a Hostinger KVM (Ubuntu 22.04/24.04).
# Idempotent: safe to re-run after every `git pull`.
#
# Usage (as root on the VPS):
#   SITE_ADDRESS=app.example.com ./deploy/deploy.sh
#   SITE_ADDRESS=:80            ./deploy/deploy.sh   # HTTP-only on port 80 (no domain yet)
#
# Env overrides:
#   REPO_DIR   — where to clone/pull (default /opt/creative-gen)
#   REPO_URL   — git remote if REPO_DIR doesn't exist yet
#   SVC_USER   — system user that runs uvicorn (default creativegen)

set -euo pipefail

: "${REPO_DIR:=/opt/creative-gen}"
: "${REPO_URL:=https://github.com/kidboyloot/creative-gen.git}"
: "${SVC_USER:=creativegen}"
: "${SITE_ADDRESS:=}"

if [[ -z "$SITE_ADDRESS" ]]; then
	echo "ERROR: set SITE_ADDRESS to your domain (e.g. app.example.com) or :80 for bare-IP HTTP."
	exit 1
fi

log() { printf '\n=== %s ===\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
	echo "Run as root (the script installs packages and writes into /etc + /opt)."
	exit 1
fi

log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt install -y \
	python3 python3-venv python3-pip \
	nodejs npm \
	git curl \
	debian-keyring debian-archive-keyring apt-transport-https

# Caddy repo (official)
if ! command -v caddy >/dev/null 2>&1; then
	log "Installing Caddy"
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
	apt update -y
	apt install -y caddy
fi

log "Service user + code checkout"
id "$SVC_USER" >/dev/null 2>&1 || useradd --system --home "$REPO_DIR" --shell /usr/sbin/nologin "$SVC_USER"

if [[ ! -d "$REPO_DIR/.git" ]]; then
	git clone "$REPO_URL" "$REPO_DIR"
else
	git -C "$REPO_DIR" fetch --all
	git -C "$REPO_DIR" reset --hard origin/main
fi
chown -R "$SVC_USER:$SVC_USER" "$REPO_DIR"

log "Backend venv + deps"
sudo -u "$SVC_USER" bash <<EOF
set -e
cd "$REPO_DIR/backend"
python3 -m venv --upgrade-deps venv
./venv/bin/pip install --quiet -r requirements.txt
EOF

# Make sure .env exists — uvicorn refuses to start if the systemd EnvironmentFile is missing.
if [[ ! -f "$REPO_DIR/backend/.env" ]]; then
	log "Creating empty backend/.env (add secrets here)"
	install -o "$SVC_USER" -g "$SVC_USER" -m 640 /dev/null "$REPO_DIR/backend/.env"
	cat > "$REPO_DIR/backend/.env" <<'EOF'
# Put your secrets here (FAL_KEY, JWT_SECRET, OPENAI_API_KEY, ANTHROPIC_API_KEY, ...).
# This file is read by systemd at service start — restart creative-gen after editing.
EOF
	chown "$SVC_USER:$SVC_USER" "$REPO_DIR/backend/.env"
	chmod 640 "$REPO_DIR/backend/.env"
fi

log "Building frontend"
# Same-origin API in prod → empty baseURL is correct, Caddy routes /auth /shopify etc to uvicorn.
sudo -u "$SVC_USER" bash <<EOF
set -e
cd "$REPO_DIR/frontend"
npm install --no-audit --no-fund --silent
npm run build
EOF

log "systemd unit for uvicorn"
install -m 644 "$REPO_DIR/deploy/creative-gen.service" /etc/systemd/system/creative-gen.service
systemctl daemon-reload
systemctl enable creative-gen >/dev/null
systemctl restart creative-gen

log "Caddy config"
install -d /etc/caddy
install -m 644 "$REPO_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
# Inject SITE_ADDRESS via Caddy env override
install -d /etc/systemd/system/caddy.service.d
cat > /etc/systemd/system/caddy.service.d/override.conf <<EOF
[Service]
Environment="SITE_ADDRESS=$SITE_ADDRESS"
EOF
systemctl daemon-reload
systemctl enable caddy >/dev/null
systemctl restart caddy

log "Opening firewall (ufw if present)"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
	ufw allow 80/tcp >/dev/null || true
	ufw allow 443/tcp >/dev/null || true
fi

log "Status"
systemctl --no-pager --lines=5 status creative-gen || true
systemctl --no-pager --lines=5 status caddy || true

cat <<EOF

Deploy complete.

Edit secrets:     $REPO_DIR/backend/.env
Restart backend:  systemctl restart creative-gen
Restart Caddy:    systemctl restart caddy
Backend logs:     journalctl -u creative-gen -f
Caddy logs:       journalctl -u caddy -f

Your app should now be reachable at: $SITE_ADDRESS
(If you used a domain, HTTPS is auto-provisioned by Caddy on first request — give it ~30s.)
EOF
