# Vaultwarden

## Overview
Self-hosted Bitwarden-compatible password manager running on Argus.
Deployed: 2026-04-22.

## Access
- Web vault: https://vault.ningi.dev
- Admin panel: https://vault.ningi.dev/admin
  (token in ~/docker/infrastructure/vaultwarden.env)
- Client: Bitwarden app → Self-hosted → https://vault.ningi.dev

## Compose
- File: ~/docker/infrastructure/docker-compose.yml
- Env: ~/docker/infrastructure/vaultwarden.env
- Volume: vaultwarden_data (Docker named volume)
- Network: homelab

## Config
- SIGNUPS_ALLOWED: false
- WEBSOCKET_ENABLED: true
- DOMAIN: https://vault.ningi.dev

## Notes
- SMTP not configured — new users must register via web vault
- Admin token is plaintext base64 in env file
  (upgrade to Argon2 hash for hardening if needed later)
