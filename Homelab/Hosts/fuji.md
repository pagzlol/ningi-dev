# fuji

> Remote VPS running the Cowrie SSH honeypot and Wazuh agent. Public-facing on a real IP — port 22 is the honeypot, real SSH is on 2233. Also stores security research data and recon output synced from argus.

---

## Identity

| Field | Value |
|-------|-------|
| Hostname | `fuji` |
| SSH target | `t@100.119.8.6` |
| SSH port | `2233` |
| Public IP | `175.45.180.167` |
| Tailscale IP | `100.119.8.6` |
| Platform | KVM VPS |
| Role | SSH honeypot (Cowrie) + Wazuh agent + security research |

---

## System

| Field | Value |
|-------|-------|
| OS | Ubuntu 24.04.4 LTS (Noble Numbat) |
| Kernel | `6.8.0-106-generic` |
| CPU | 1 vCPU — Common KVM Processor v5 |
| RAM | 1.9 GB total / ~497 MB used / 1 GB swap (72 MB used) |
| Disk | 40 GB (`/dev/vda1`) — 12 GB used (31%) |

As of 2026-04-16, uptime was 15 days.

---

## Network

| Interface | Address | Notes |
|-----------|---------|-------|
| `eth0` | `175.45.180.167/24` | Public IP (internet-facing) |
| `tailscale0` | `100.119.8.6/32` | Tailscale mesh VPN |
| `lo` | `127.0.0.1` | Loopback |

---

## Open Ports

| Port | Bound to | Service |
|------|----------|---------|
| 22 | `0.0.0.0` / `[::]` | **Cowrie SSH honeypot** (systemd socket) |
| 2233 | `0.0.0.0` / `[::]` | Real SSH |
| 53 | `127.0.0.53`, `127.0.0.54` | systemd-resolved |
| 35066 | Tailscale | Tailscale internal |

> Port 22 is intentionally exposed publicly and served by Cowrie — all connections are logged as honeypot sessions. Real SSH management is on port 2233.

---

## Cowrie Honeypot

### Configuration
- Config: `/home/cowrie/cowrie/etc/cowrie.cfg`
- Fake hostname presented to attackers: `fuji`
- Transport: SSH
- Socket activation: systemd (both IPv4 and IPv6)
- Log format: JSON (`output_jsonlog`)
- Log path: `/home/cowrie/cowrie/var/log/cowrie/cowrie.json`
- Logs rotate daily — retained as `cowrie.json.YYYY-MM-DD`

### Log Retention
Daily JSON logs observed from at least 2026-04-02 onward. Each file captures all sessions for that day.

### Tooling
- `/home/t/cowrie-ops/` — scripts for parsing/processing Cowrie logs
- `/home/t/cowrie-reports/` — generated reports from Cowrie sessions

---

## System Services (Notable)

| Service | Purpose |
|---------|---------|
| `cowrie` | SSH honeypot — listens on port 22 |
| `wazuh-agent` | Security monitoring — reports to Wazuh manager on argus |
| `auditd` | Kernel audit subsystem |
| `fail2ban` | Brute-force protection (guards port 2233) |
| `tailscaled` | Tailscale VPN |
| `ufw` | Firewall |
| `apparmor` | Mandatory access control |
| `rsyslog` | System logging |
| `unattended-upgrades` | Automatic security updates |
| `open-vm-tools` / `vgauth` | KVM/VMware guest tooling |
| `cron` | Scheduled tasks |
| `snapd` | Snap package management |

---

## Home Directory (`/home/t/`)

| Path | Description |
|------|-------------|
| `cowrie-ops/` | Cowrie log processing scripts |
| `cowrie-reports/` | Generated honeypot session reports |
| `homelab-security-research/` | Security research notes and data |
| `recon/` | Recon data (synced from argus) |
| `ningi-homelab-ai-md/` | AI/homelab documentation project |
| `ningi-homelab-backup/` | Backup scripts/configs |
| `mybash/` | Custom bash config/aliases |
| `bin/` | Local user scripts |

---

## Security

- **Cowrie** on port 22 — all brute-force and automated SSH attacks are silently captured
- **fail2ban** — additional protection on the real SSH port (2233)
- **Wazuh agent** — reporting to Wazuh manager on argus (100.105.93.66)
- **auditd** — kernel audit enabled
- **ufw** firewall active
- **AppArmor** enforcing
- **No Docker** installed — minimal attack surface

---

## Architecture Overview

```
Internet
    │
    ├── :22 ──► Cowrie honeypot
    │               │
    │               └── JSON logs ──► /home/cowrie/.../cowrie.json (daily rotation)
    │                       │
    │                       └── cowrie-ops scripts ──► cowrie-reports/
    │
    └── :2233 ──► Real SSH (fail2ban protected)

Tailscale mesh
    └── fuji (100.119.8.6)
            │
            └── Wazuh agent ──► argus Wazuh manager (100.105.93.66:1514)
```

---

## Tags
#homelab #host #vps #ubuntu #cowrie #honeypot #wazuh #tailscale #security-research
