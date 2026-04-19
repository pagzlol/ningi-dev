# Docker Migration Runbook — Move All Stacks to ~/docker

**Date drafted:** 2026-04-18  
**Argus status:** Out of DMZ — LAN bindings (192.168.0.155) can be dropped  
**Tailscale IP:** 100.105.93.66  

---

## Target Layout

```
~/docker/
├── arrrs/               (from ~/arrrs/)
├── infrastructure/      (from ~/infrastructure/)
├── n8n/                 (from ~/n8n/)
└── wazuh/
    └── single-node/     (from ~/wazuh-docker/single-node/)

~/wazuh-docker/          stays — git-managed repo (Wazuh upstream)
```

---

## Section 1 — What Will Break

### 1.1 `infrastructure/docker-compose.yml` — CRITICAL

NPM has hardcoded absolute paths that break on move:

```yaml
# Must change to relative paths BEFORE moving
- /home/t/infrastructure/config/npm/data:/data
- /home/t/infrastructure/config/npm/letsencrypt:/etc/letsencrypt
- /home/t/infrastructure/www:/var/www/html
- /home/t/infrastructure/npm-default.conf:/etc/nginx/conf.d/default.conf
```

Fix: replace all four with `./config/npm/data`, `./config/npm/letsencrypt`, `./www`, `./npm-default.conf`.

### 1.2 `restic-argus-backup.sh` — HIGH (will silently skip)

File: `~/ningi-homelab-backup/scripts/restic-argus-backup.sh`

Update `BACKUP_PATHS` array:

```bash
# Old → New
/home/t/arrrs/.env                               → /home/t/docker/arrrs/.env
/home/t/arrrs/docker-compose.yml                 → /home/t/docker/arrrs/docker-compose.yml
/home/t/arrrs/config                             → /home/t/docker/arrrs/config
/home/t/infrastructure/docker-compose.yml        → /home/t/docker/infrastructure/docker-compose.yml
/home/t/infrastructure                           → /home/t/docker/infrastructure
/home/t/wazuh-docker/single-node/.env            → /home/t/docker/wazuh/single-node/.env
/home/t/wazuh-docker/single-node/config          → /home/t/docker/wazuh/single-node/config
/home/t/wazuh-docker/single-node/docker-compose.yml → /home/t/docker/wazuh/single-node/docker-compose.yml
```

Note: `/home/t/wazuh-docker/.env` (repo root) stays — not moving that.

### 1.3 `backup.sh` (git backup) — MEDIUM (warns, doesn't fail hard)

File: `~/ningi-homelab-backup/scripts/backup.sh`, function `backup_local_configs()`

Update 5 `backup_file` source paths:

```bash
# Old                                                        → New
"$LOCAL_HOME/wazuh-docker/single-node/docker-compose.yml"  → "$LOCAL_HOME/docker/wazuh/single-node/docker-compose.yml"
"$LOCAL_HOME/wazuh-docker/single-node/.env"                 → "$LOCAL_HOME/docker/wazuh/single-node/.env"
"$LOCAL_HOME/wazuh-docker/.env"                             # stays (repo root, not moving)
"$LOCAL_HOME/infrastructure/docker-compose.yml"             → "$LOCAL_HOME/docker/infrastructure/docker-compose.yml"
"$LOCAL_HOME/arrrs/docker-compose.yml"                      → "$LOCAL_HOME/docker/arrrs/docker-compose.yml"
"$LOCAL_HOME/arrrs/.env"                                    → "$LOCAL_HOME/docker/arrrs/.env"
```

### 1.4 Docker Networks — SAFE

- `homelab` — manually created external network, unaffected by folder moves
- `single-node_default` — auto-named from directory name `single-node/`; directory keeps that name under `~/docker/wazuh/single-node/`, so network name is unchanged. Grafana's cross-stack reference in `infrastructure/docker-compose.yml` stays valid.

### 1.5 Wazuh SSL certs / config — SAFE

All Wazuh mounts use `./config/...` relative paths. Moving the folder carries them along.

### 1.6 arrrs config — SAFE

All `./config/<service>:/config` mounts — relative, moves fine.

### 1.7 n8n — SAFE

Named volume `n8n_data` only. No bind mounts.

### 1.8 Crontab — NO CHANGES NEEDED

All cron entries point to `~/bin/`, `~/ningi-homelab-backup/`, `~/recon/` — none reference docker compose paths.

### 1.9 homelab-dashboard — DOES NOT EXIST

`~/homelab-dashboard/` not present on disk. No action needed.

---

## Section 2 — Port Binding Hardening

NPM `:80`/`:443` are the only services that must keep `0.0.0.0` binding.
All other `192.168.0.155:*` bindings can be removed.

| Service | Current | Action |
|---|---|---|
| nginx_proxy_manager `:80/:443` | `0.0.0.0` | **Keep** — public ingress |
| nginx_proxy_manager `:81` | `100.105.93.66` | Keep |
| Grafana `:3000` | Tailscale + LAN | Drop `192.168.0.155` |
| Seerr `:5055` | Tailscale + LAN | Drop `192.168.0.155` |
| qBittorrent `:8080` | Tailscale + LAN | Drop `192.168.0.155` |
| qBittorrent `:6881` | Tailscale + LAN | Drop `192.168.0.155` |
| SABnzbd `:8085` | Tailscale + LAN | Drop `192.168.0.155` |
| Sonarr `:8989` | Tailscale + LAN | Drop `192.168.0.155` |
| Radarr `:7878` | Tailscale + LAN | Drop `192.168.0.155` |
| Prowlarr `:9696` | Tailscale + LAN | Drop `192.168.0.155` |
| Lidarr `:8686` | Tailscale + LAN | Drop `192.168.0.155` |
| Wazuh manager `:1514/:1515` | `100.105.93.66` | Keep (agent enrollment) |
| Wazuh dashboard `:8443` | `100.105.93.66` | Keep |
| wazuh.indexer `:9200` | `127.0.0.1` | Already correct |
| n8n `:5678` | No host binding | Already correct |

---

## Section 3 — Execution Order

### Phase 0 — Pre-flight edits (no downtime, do first)

- [ ] Fix `~/infrastructure/docker-compose.yml`: change 4 NPM volume paths to relative
- [ ] Validate: `cd ~/infrastructure && docker compose config` (should parse cleanly)
- [ ] Update `restic-argus-backup.sh` BACKUP_PATHS (8 paths)
- [ ] Update `backup.sh` `backup_local_configs()` (5 `backup_file` source paths)
- [ ] Create directory skeleton:
  ```bash
  mkdir -p ~/docker/wazuh ~/docker/arrrs ~/docker/infrastructure ~/docker/n8n
  ```

### Phase 1 — Move arrrs

```bash
cd ~/arrrs && docker compose down
mv ~/arrrs ~/docker/arrrs
cd ~/docker/arrrs && docker compose up -d
docker compose ps
```

Verify: qBittorrent, Sonarr, Radarr, Prowlarr, Lidarr, SABnzbd, Seerr all healthy.

### Phase 2 — Move n8n

```bash
cd ~/n8n && docker compose down
mv ~/n8n ~/docker/n8n
cd ~/docker/n8n && docker compose up -d
docker compose ps
```

Verify: n8n reachable via https://n8n.ningi.dev

### Phase 3 — Move infrastructure (NPM + Grafana + Watchtower)

Longest downtime — NPM going down takes all proxy routes offline.

```bash
cd ~/infrastructure && docker compose down
mv ~/infrastructure ~/docker/infrastructure
cd ~/docker/infrastructure && docker compose up -d
docker compose ps
```

Verify:
- NPM admin UI accessible at http://100.105.93.66:81
- Grafana accessible at http://100.105.93.66:3000
- Proxy hosts still resolving (spot-check ningi.dev, seerr.ningi.dev, n8n.ningi.dev)

### Phase 4 — Move Wazuh single-node (most sensitive, do last)

```bash
cd ~/wazuh-docker/single-node && docker compose down
mkdir -p ~/docker/wazuh
mv ~/wazuh-docker/single-node ~/docker/wazuh/single-node
cd ~/docker/wazuh/single-node && docker compose up -d
```

Verify:
```bash
docker compose ps
docker network ls | grep single-node   # must show single-node_default
# Confirm Grafana still reaches wazuh.indexer after infrastructure restart if needed
```

If Grafana lost its wazuh.indexer connection (single-node_default was briefly gone):
```bash
cd ~/docker/infrastructure && docker compose restart grafana
```

### Phase 5 — Port binding cleanup

After all stacks verified, edit compose files to remove `192.168.0.155:*` lines, then:

```bash
cd ~/docker/arrrs       && docker compose up -d   # Compose recreates only changed containers
cd ~/docker/infrastructure && docker compose up -d
```

Wazuh bindings are already Tailscale-only — no change needed there.

### Phase 6 — Post-move backup test

```bash
cd ~/ningi-homelab-backup && BACKUP_ENV_FILE=~/ningi-homelab-backup/.backup.env ./scripts/backup.sh --dry
# Should show zero [WARN] lines for docker paths
```

---

## Section 4 — Files to Edit (quick reference)

| File | Change |
|---|---|
| `~/infrastructure/docker-compose.yml` | 4 absolute NPM volume paths → relative |
| `~/ningi-homelab-backup/scripts/restic-argus-backup.sh` | 8 BACKUP_PATHS entries |
| `~/ningi-homelab-backup/scripts/backup.sh` | 5 `backup_file` source paths in `backup_local_configs()` |

---

## Section 5 — Rollback

If a stack fails to start in new location:

```bash
# Example: arrrs rollback
cd ~/docker/arrrs && docker compose down
mv ~/docker/arrrs ~/arrrs
cd ~/arrrs && docker compose up -d
```

Named volumes (Wazuh, n8n, Grafana) are stored in Docker's volume store (`/var/lib/docker/volumes/`), not in the compose directory — they survive any folder move and are unaffected by rollback.

Bind-mount data (`arrrs/config/`, `infrastructure/config/npm/`) moves with the folder — rollback restores it automatically.
