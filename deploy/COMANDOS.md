# Comandos úteis no VPS — copia daqui

## Actualizar tudo depois de um `git push`

```
sudo -u creativegen git -C /opt/creative-gen pull
sudo -u creativegen bash -c "cd /opt/creative-gen/backend && ./venv/bin/pip install -r requirements.txt --quiet"
sudo -u creativegen bash -c "cd /opt/creative-gen/frontend && npm install --silent && npm run build"
cp /opt/creative-gen/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl restart creative-gen
systemctl reload caddy
```

## Só rebuild do frontend

```
sudo -u creativegen bash -c "cd /opt/creative-gen/frontend && npm run build"
```

## Só restart do backend

```
systemctl restart creative-gen
```

## Reload do Caddy depois de mexer no Caddyfile

```
cp /opt/creative-gen/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```

## Ver logs

```
journalctl -u creative-gen -f
```

```
journalctl -u caddy -f
```

```
journalctl -u creative-gen -n 50 --no-pager
```

## Testar a API directamente (bypass do browser)

Login:
```
curl -i -X POST http://187.124.187.204/auth/login -H 'Content-Type: application/json' -d '{"email":"abobora@creativegen.com","password":"password"}'
```

Health:
```
curl -i http://127.0.0.1:8000/
```

## Editar variáveis de ambiente do backend (FAL_KEY, JWT_SECRET, DATABASE_URL, ...)

```
nano /opt/creative-gen/backend/.env
systemctl restart creative-gen
```

## Backup manual da DB (Supabase já faz auto, isto é extra)

```
/etc/cron.daily/creativegen-db-backup
ls -la /var/backups/creative-gen/
```

## Ver estado dos serviços

```
systemctl status creative-gen --no-pager
systemctl status caddy --no-pager
```

## Ver portas a ouvir

```
ss -tlnp
```
