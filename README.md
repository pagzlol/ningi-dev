# NINGI//LAB — Vault Index

> Navigation hub for the homelab knowledge base. All notes are sourced from `pagzlol/ningi-homelab-ai-md` as the authoritative source of truth.

---

## Hosts

| Note | Host | Role |
|------|------|------|
| [[Homelab/Hosts/argus]] | argus | Primary bare-metal host — media, SIEM, LLM, IRC |
| [[Homelab/Hosts/fuji]] | fuji | VPS honeypot, recon vantage point |
| [[Homelab/Hosts/margo-1]] | margo-1 | GCP portfolio site host |

Quick IPs:

| Host | LAN | Tailscale | Public |
|------|-----|-----------|--------|
| argus | 192.168.0.155 | 100.105.93.66 | 1.156.160.89 |
| fuji | — | 100.119.8.6 | 175.45.180.167 |
| margo-1 | 10.128.0.3 | 100.117.14.55 | 35.208.42.252 |

---

## Stacks

| Note | What it covers |
|------|---------------|
| [[Stacks/Media-Stack]] | Plex, Sonarr, Radarr, Lidarr, Prowlarr, qBittorrent, SABnzbd — `~/arrrs/` |
| [[Stacks/Wazuh-Stack]] | SIEM — manager, indexer, dashboard, realtime relay — `~/wazuh-docker/single-node/` |
| [[Stacks/Infrastructure-Stack]] | Nginx Proxy Manager, Grafana, Watchtower, Loki — `~/infrastructure/` |
| [[Stacks/Loki-Stack]] | Log aggregation — Loki + Promtail across all hosts |
| [[Stacks/n8n-Stack]] | Workflow automation — `~/n8n/` |

---

## Services

| Note | Service | Host |
|------|---------|------|
| [[Services/Cowrie]] | SSH honeypot + recon stack | fuji |
| [[Services/Recon-Stack]] | External attack-surface monitoring | fuji |
| [[Services/Ollama]] | Local LLM inference (qwen2.5:14b, RTX 3060) | argus |
| [[Services/ZNC]] | IRC bouncer | argus |
| [[Services/Plex]] | Media streaming | argus |
| [[Services/Nginx-Proxy-Manager]] | Reverse proxy + TLS | argus |
| [[Services/Discord-Bot]] | Wazuh alerting + daily digest | argus |
| [[Services/Portfolio-Site]] | research.ningi.dev (MkDocs Material) | margo-1 |

---

## Runbooks

| Note | When to use it |
|------|---------------|
| [[Runbooks/Argus-Health-Check]] | After reboots, after changes, general triage |
| [[Runbooks/Fuji-Health-Check]] | Cowrie/Wazuh agent issues, recon stack issues |
| [[Runbooks/Margo-1-Health-Check]] | Site down, Wazuh agent disconnected |
| [[Runbooks/Docker-Stack-Recovery]] | Container crashed, stack won't start |
| [[Runbooks/Docker-Migration]] | Move all stacks to `~/docker/` layout |
| [[Runbooks/Wazuh-Troubleshooting]] | Agent disconnected, rules not firing |
| [[Runbooks/Add-Wazuh-Agent]] | Adding a new host to Wazuh monitoring |
| [[Runbooks/SSH-Hardening]] | Setting up SSH on a new host |

---

## Backups

| Note | What it covers |
|------|---------------|
| [[Backups/Backup-Strategy]] | Git snapshot + restic to fuji, operator commands, rebuild procedure |

---

## Incidents

| Note | What happened |
|------|--------------|
| [[Incidents/Incident-Template]] | Template for documenting new incidents |

Security research writeups live in the submodule at `Incidents/homelab-security-research/writeups/` — see that folder in Obsidian for all NINGI-WRITEUP-* entries.

---

## Source of Truth

All homelab infrastructure facts come from:

- **Vault path:** `Homelab/ningi-homelab-ai-md/`
- **GitHub:** `pagzlol/ningi-homelab-ai-md` (private)

When anything in these notes conflicts with the source repo, the source repo wins. Update notes here after updating the source.

---

## Key Conventions

- SSH ports: argus `2233`, fuji `2233`, margo-1 `2244`
- Admin SSH: Tailscale-only on fuji and margo-1; LAN + Tailscale on argus
- Secrets: `/home/t/.config/argus/secrets.env` on argus (chmod 600)
- Docker stacks: `~/arrrs/`, `~/infrastructure/`, `~/wazuh-docker/single-node/`
- Wazuh agent IDs: argus `001`, fuji `002`, margo-1 `004`
- Custom Wazuh rule ranges: `100200–100201` honeytokens, `100710–100713` Cowrie syslog, `100500–100506` auditd

---

## Tags
#homelab #index
