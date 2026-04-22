# Deploying Creative Gen to a Hostinger KVM (or any Ubuntu VPS)

One-shot setup: clones the repo, installs Python + Node + Caddy, builds the
frontend, registers a `creative-gen` systemd service for the FastAPI backend,
and wires Caddy as an HTTPS reverse proxy.

## First-time setup

```bash
ssh root@YOUR_VPS_IP

# Clone the repo into a temp location just so we can run the script
git clone https://github.com/kidboyloot/creative-gen.git /root/creative-gen-bootstrap
cd /root/creative-gen-bootstrap

# With a domain that already has an A record → YOUR_VPS_IP:
SITE_ADDRESS=app.example.com ./deploy/deploy.sh

# OR, if you don't have a domain yet — serve HTTP on port 80 by IP:
SITE_ADDRESS=:80 ./deploy/deploy.sh
```

The script installs into `/opt/creative-gen`. The bootstrap clone in
`/root/creative-gen-bootstrap` can be removed afterwards.

## Adding secrets

Edit `/opt/creative-gen/backend/.env` and add:

```
FAL_KEY=...
JWT_SECRET=...          # override the default in prod
OPENAI_API_KEY=...      # optional (for the LLM translation engine)
ANTHROPIC_API_KEY=...   # optional
```

Then:

```bash
systemctl restart creative-gen
```

## Deploying updates (after every `git push` to main)

```bash
ssh root@YOUR_VPS_IP
cd /opt/creative-gen
SITE_ADDRESS=app.example.com /opt/creative-gen/deploy/deploy.sh
```

Re-runs are idempotent — it fetches latest `main`, rebuilds the frontend,
reinstalls Python deps if `requirements.txt` changed, and restarts both
services.

## Useful commands

```bash
# Live logs
journalctl -u creative-gen -f
journalctl -u caddy -f

# Status
systemctl status creative-gen
systemctl status caddy

# Restart just the backend
systemctl restart creative-gen
```

## DNS notes

If you pointed `app.example.com` at the VPS IP, Caddy auto-provisions a
Let's Encrypt TLS cert on first request — give it 30-60 seconds. If you're
seeing `TLS handshake error` in Caddy logs, the A record probably hasn't
propagated yet.
