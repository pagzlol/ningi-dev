# argus

> Primary homelab server — bare-metal workstation running Ubuntu 24.04. Hosts the full media stack, Wazuh SIEM, Ollama, n8n automation, ZNC, Grafana, and reverse proxy. Central node for the homelab.

---

## Identity

| Field | Value |
|-------|-------|
| Hostname | `argus` |
| SSH target | `t@argus` |
| SSH port | `2233` |
| LAN IP | `192.168.0.155` |
| Tailscale IP | `100.105.93.66` |
| Platform | Bare-metal workstation |
| Role | Primary homelab — media, SIEM, LLM, automation, reverse proxy |

---

## System

| Field | Value |
|-------|-------|
| OS | Ubuntu 24.04.4 LTS (Noble Numbat) |
| Kernel | `6.17.0-20-generic` |
| CPU | Intel Core i7-11700F @ 2.50 GHz — 8 cores / 16 threads |
| RAM | 15 GB total / ~5.5 GB used / 4 GB swap (1.7 GB used) |

As of 2026-04-16, uptime was 2 days.

---

## Storage

| Mount | Device | Size | Used | Notes |
|-------|--------|------|------|-------|
| `/` | `nvme0n1p2` | 468 GB | 80 GB (19%) | NVMe root |
| `/data` | ZFS pool (`1:2`) | 4.5 TB | 1.4 TB (31%) | Main data pool |
| `/mnt/disk1` | `sda1` | 3.6 TB | 1.4 TB (39%) | Secondary HDD |
| `/mnt/disk2` | `sdb1` | 916 GB | ~0 (1%) | Tertiary HDD |
| `/boot/efi` | `nvme0n1p1` | 1.1 GB | 6.2 MB | EFI partition |

Total usable storage: ~9 TB across root NVMe + ZFS + HDDs.

---

## Network

| Interface | Address | Notes |
|-----------|---------|-------|
| `eno1` | `192.168.0.155/24` | Primary LAN (ethernet) |
| `tailscale0` | `100.105.93.66/32` | Tailscale mesh VPN |
| `wlp3s0` | — | WiFi (DOWN — unused) |
| `docker0` / `br-*` | `172.17–21.0.0/16` | Docker bridge networks |

---

## Open Ports

| Port | Bound to | Service / Container |
|------|----------|---------------------|
| 80 | `0.0.0.0` | nginx-proxy-manager (HTTP) |
| 443 | `0.0.0.0` | nginx-proxy-manager (HTTPS) |
| 81 | Tailscale | nginx-proxy-manager admin UI |
| 2233 | LAN + Tailscale | SSH |
| 3000 | LAN + Tailscale | Grafana |
| 5055 | LAN + Tailscale | Seerr (media requests) |
| 6881 | LAN + Tailscale | qBittorrent (torrent) |
| 7878 | LAN + Tailscale | Radarr (movies) |
| 8080 | LAN + Tailscale | qBittorrent web UI |
| 8085 | LAN + Tailscale | SABnzbd (usenet) |
| 8443 | Tailscale | Wazuh Dashboard |
| 8686 | LAN + Tailscale | Lidarr (music) |
| 8989 | LAN + Tailscale | Sonarr (TV) |
| 9200 | localhost | Wazuh Indexer (OpenSearch) |
| 9696 | LAN + Tailscale | Prowlarr (indexers) |
| 11434 | localhost | Ollama (LLM API) |
| 32400 | `*` | Plex Media Server |
| 55000 | localhost | Wazuh Manager API |
| 1514–1515 | Tailscale | Wazuh agent ingestion |
| 34567 / 45678 | Tailscale | ZNC IRC ports |
| 113 | `*` | oidentd (IRC ident) |

---

## Docker Containers

| Container | Image | Uptime | Purpose |
|-----------|-------|--------|---------|
| `nginx_proxy_manager` | `jc21/nginx-proxy-manager` | 2 days | Reverse proxy + SSL termination |
| `plex` | `linuxserver/plex` | 2 days | Media server |
| `sonarr` | `linuxserver/sonarr` | 2 days | TV show management |
| `radarr` | `linuxserver/radarr` | 2 days | Movie management |
| `sabnzbd` | `linuxserver/sabnzbd` | 2 days | Usenet downloader |
| `qbittorrent` | `linuxserver/qbittorrent` | 31 hrs | Torrent client |
| `grafana` | `grafana/grafana-oss` | 31 hrs | Metrics dashboard |
| `prowlarr` | `linuxserver/prowlarr` | 7 hrs | Indexer manager |
| `lidarr` | `linuxserver/lidarr` | 7 hrs | Music management |
| `seerr` | `seerr-team/seerr` | 7 hrs | Media request UI |
| `n8n` | `n8nio/n8n` | 3 hrs | Workflow automation |
| `single-node-wazuh.manager-1` | `wazuh/wazuh-manager:4.14.4` | 36 hrs | Wazuh SIEM manager |
| `single-node-wazuh.indexer-1` | `wazuh/wazuh-indexer:4.14.4` | 36 hrs | OpenSearch (Wazuh backend) |
| `single-node-wazuh.dashboard-1` | `wazuh/wazuh-dashboard:4.14.4` | 36 hrs | Wazuh web dashboard |
| `media_watchtower` | `containrrr/watchtower` | 2 days | Auto-updates containers |

---

## System Services (Notable)

| Service | Purpose |
|---------|---------|
| `docker` / `containerd` | Container runtime |
| `wazuh-agent` + `wazuh-realtime` | Local Wazuh agent + real-time file integrity |
| `auditd` | Linux audit subsystem |
| `ollama` | Local LLM inference server (localhost:11434) |
| `znc` | IRC bouncer |
| `discord-bot` | Custom Discord bot (`discord_bot.py`) |
| `tailscaled` | Tailscale VPN |
| `openvpn` | OpenVPN client/server |
| `hostapd` | WiFi access point (wlp3s0 configured but currently DOWN) |
| `oidentd` | IRC ident daemon |
| `nvidia-*` | NVIDIA GPU power management (hibernate/resume/suspend) |
| `lm-sensors` | CPU/hardware temperature monitoring |
| `ufw` | Firewall |
| `sssd` | System security services (LDAP/AD integration) |
| `rsyslog` | Syslog |
| `unattended-upgrades` | Automatic security updates |
| `apparmor` | Mandatory access control |

---

## Home Directory (`/home/t/`)

| Path | Description |
|------|-------------|
| `argus_auditd_filter.py` | Custom auditd log parser/filter |
| `wazuh_realtime.py` | Wazuh real-time alert script |
| `discord_bot.py` | Discord bot source |
| `wazuh-docker/` | Wazuh single-node Docker compose stack |
| `n8n/` | n8n workflow data |
| `mcp/` | MCP server configurations |
| `infrastructure/` | Infra configs / IaC |
| `ningi-homelab-ai-md/` | AI/homelab documentation project |
| `ningi-homelab-backup/` | Backup scripts/configs |
| `everything-claude-code/` | Claude Code related configs |
| `arrrs/` | *arr suite configs |
| `recon/` | Recon/security research data |
| `beets/` | Beets music library manager |

---

## Security

- **Wazuh SIEM** — full single-node stack running locally (manager, indexer, dashboard)
- **wazuh-agent** — also installed as a native service (reports to local manager)
- **wazuh-realtime** — custom real-time alerting on top of Wazuh events
- **auditd** — kernel-level syscall auditing with custom filter script
- **ufw** — firewall enabled
- **AppArmor** — enabled
- **NVIDIA GPU** present (nvidia services, GPU manager)
- **Unattended upgrades** active

---

## Architecture Overview

```
Internet
    │
    ▼
nginx-proxy-manager (:80/:443)
    │
    ├── Plex (:32400)
    ├── Sonarr / Radarr / Lidarr / Prowlarr / SABnzbd / qBittorrent
    ├── Seerr (:5055)
    ├── Grafana (:3000)
    ├── n8n (:5678)
    └── Wazuh Dashboard (:8443)

Wazuh Stack (Docker)
    ├── wazuh-manager (:1514/:1515) ← agents: margo-1, fuji, argus-local
    ├── wazuh-indexer (OpenSearch :9200 localhost)
    └── wazuh-dashboard (:8443)

Local Services
    ├── Ollama (:11434 localhost) — local LLM
    ├── ZNC (:34567/:45678) — IRC bouncer
    ├── Discord bot — custom bot
    └── auditd + wazuh-realtime — security pipeline

Tailscale mesh
    ├── argus (100.105.93.66) ← primary node
    ├── fuji  (100.119.8.6)
    └── margo-1 (100.117.14.55)
```

---

## Tags
#homelab #host #bare-metal #ubuntu #docker #wazuh #plex #media #ollama #n8n #grafana #tailscale #siem
