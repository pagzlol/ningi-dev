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
└── wazuh-docker/        (from ~/wazuh-docker/ — full repo moved)
    └── single-node/
```

> **As-built note:** The full `wazuh-docker/` repo was moved to `~/docker/wazuh-docker/`
> (not `~/docker/wazuh/` as originally planned). All backup script paths use `wazuh-docker`.
> Old `~/arrrs/` dir still on disk — was copied not moved; safe to `rm -rf ~/arrrs` once confirmed.

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

**STATUS: DONE ✅** — updated 2026-04-20

File: `~/ningi-homelab-backup/scripts/restic-argus-backup.sh`

Current `BACKUP_PATHS` (as-built):

```bash
/home/t/docker/arrrs/.env
/home/t/docker/arrrs/docker-compose.yml
/home/t/docker/arrrs/config
/home/t/docker/infrastructure/docker-compose.yml
/home/t/docker/infrastructure
/home/t/docker/wazuh-docker/.env
/home/t/docker/wazuh-docker/single-node/.env
/home/t/docker/wazuh-docker/single-node/config
/home/t/docker/wazuh-docker/single-node/docker-compose.yml
```

All paths verified present on disk.

### 1.3 `backup.sh` (git backup) — MEDIUM (warns, doesn't fail hard)

**STATUS: DONE ✅** — updated 2026-04-20

File: `~/ningi-homelab-backup/scripts/backup.sh`, function `backup_local_configs()`

Current paths (as-built, wazuh uses `wazuh-docker` not `wazuh`):

```bash
"$LOCAL_HOME/docker/wazuh-docker/single-node/docker-compose.yml"  → wazuh/single-node/docker-compose.yml
"$LOCAL_HOME/docker/wazuh-docker/multi-node/docker-compose.yml"   → wazuh/multi-node/docker-compose.yml
"$LOCAL_HOME/docker/wazuh-docker/.env"                            → wazuh/.env
"$LOCAL_HOME/docker/wazuh-docker/single-node/.env"                → wazuh/single-node/.env
"$LOCAL_HOME/docker/infrastructure/docker-compose.yml"            → infrastructure/docker-compose.yml
"$LOCAL_HOME/docker/arrrs/docker-compose.yml"                     → arrrs/docker-compose.yml
"$LOCAL_HOME/docker/arrrs/.env"                                   → arrrs/.env
"$LOCAL_HOME/docker/n8n/docker-compose.yml"                       → n8n/docker-compose.yml
```

Dry-run clean — zero WARNs for any docker paths.

### 1.4 Docker Networks — SAFE ✅

- `homelab` — manually created external network, unaffected by folder moves
- `single-node_default` — auto-named from directory name `single-node/`; directory kept that name under `~/docker/wazuh-docker/single-node/`, so network name unchanged. Grafana's cross-stack reference valid.

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
| qBittorrent `:6881` | `192.168.0.155` | **Keep** — torrent peers need LAN reachability |
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

### Phase 0 — Pre-flight edits ✅ DONE

- [x] Fix `~/infrastructure/docker-compose.yml`: NPM volume paths updated to `~/docker/infrastructure/…` absolute (not relative per plan, but functional)
- [x] Update `restic-argus-backup.sh` BACKUP_PATHS (2026-04-20)
- [x] Update `backup.sh` `backup_local_configs()` (2026-04-20)
- [x] Directory skeleton created

### Phase 1 — Move arrrs ✅ DONE

Stack active at `~/docker/arrrs/`. All 7 arr containers healthy on `homelab` network.

> Note: `~/arrrs/` old dir still on disk (was copied, not moved). Safe to remove:
> ```bash
> rm -rf ~/arrrs
> ```

### Phase 2 — Move n8n ✅ DONE

Stack active at `~/docker/n8n/`. n8n accessible at https://n8n.ningi.dev.

### Phase 3 — Move infrastructure (NPM + Grafana + Watchtower) ✅ DONE

Stack active at `~/docker/infrastructure/`. NPM, Grafana, Watchtower all running.

### Phase 4 — Move Wazuh ✅ DONE

> **As-built:** entire `~/wazuh-docker/` moved to `~/docker/wazuh-docker/` (not `~/docker/wazuh/` as planned).

Stack active at `~/docker/wazuh-docker/single-node/`. All 3 Wazuh containers up, all 4 agents Active.

Network `single-node_default` and `single-node_wazuh-net` both present — Grafana connectivity confirmed.

### Phase 5 — Port binding cleanup ✅ DONE

All `192.168.0.155:*` WebUI bindings removed. All services Tailscale-only.
qBittorrent `:6881` intentionally kept on `192.168.0.155` for torrent peer reachability.

### Phase 6 — Post-move backup test ✅ DONE (2026-04-20)

```bash
cd ~/ningi-homelab-backup && BACKUP_ENV_FILE=~/ningi-homelab-backup/.backup.env ./scripts/backup.sh --dry
```

Result: zero WARNs for docker migration paths. Four pre-existing WARNs for unrelated scripts
(`argus_digest.py`, `argus_status.py`, `requirements-argus.txt`, `argus-bot.service`).

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
