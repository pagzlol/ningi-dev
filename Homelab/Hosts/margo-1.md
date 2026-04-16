# margo-1

> Public-facing GCP instance. Hosts the ningi.dev portfolio site and runs a Wazuh security agent reporting back to the homelab.

---

## Identity

| Field | Value |
|-------|-------|
| Hostname | `margo-1` |
| SSH target | `marsc@100.117.14.55` |
| SSH port | `2244` |
| Tailscale IP | `100.117.14.55` |
| Internal IP | `10.128.0.3` (GCP ens4) |
| Platform | Google Cloud Platform (GCP) |
| Role | Public site host + Wazuh agent |

---

## System

| Field | Value |
|-------|-------|
| OS | Debian GNU/Linux 12 (Bookworm) |
| Kernel | `6.1.0-43-cloud-amd64` |
| CPU | Intel Xeon @ 2.20 GHz — 2 vCPUs (1 core, 2 threads) |
| RAM | 3.8 GB total / ~780 MB used / no swap |
| Disk | 9.7 GB root — 5.3 GB used (58%) |
| Boot | EFI — `/dev/sda15` 124 MB |

As of 2026-04-16, uptime was 16 days.

---

## Network

| Interface | Address | Notes |
|-----------|---------|-------|
| `ens4` | `10.128.0.3/32` | GCP internal NIC |
| `tailscale0` | `100.117.14.55/32` | Tailscale mesh VPN |
| `lo` | `127.0.0.1` | Loopback |

### Open Ports

| Port | Proto | Bound to | Service |
|------|-------|----------|---------|
| 80 | TCP | `0.0.0.0` | nginx (public web) |
| 2244 | TCP | `100.117.14.55` + `127.0.0.1` | SSH (Tailscale only) |
| 20201 | TCP | `*` | Wazuh agent |
| 20202 | TCP | `0.0.0.0` | Wazuh agent |
| 5355 | TCP | `0.0.0.0` / `[::]` | LLMNR / systemd-resolved |
| 25 | TCP | `127.0.0.1` | Local SMTP (postfix/exim) |
| 53 | TCP | `127.0.0.53`, `127.0.0.54` | systemd-resolved |

> SSH is only reachable via Tailscale — not exposed on the public GCP IP.

---

## Services

### Enabled & Running

| Service | Purpose |
|---------|---------|
| `nginx` | Web server — serves ningi.dev |
| `wazuh-agent` | Security monitoring agent |
| `tailscaled` | Tailscale VPN mesh |
| `google-cloud-ops-agent` | GCP Cloud Monitoring / Logging |
| `google-guest-agent-manager` | GCP guest agent (metadata, SSH keys) |
| `google-osconfig-agent` | GCP OS Config (patch management) |
| `ssh` | OpenSSH server |
| `cron` | Cron daemon |
| `rsyslog` | System logging |
| `unattended-upgrades` | Automatic security updates |
| `systemd-resolved` | DNS resolver |
| `systemd-networkd` | Network management |
| `systemd-timesyncd` | NTP time sync |
| `haveged` | Entropy daemon |
| `apparmor` | Mandatory access control |

---

## Web Hosting

### nginx

Config location: `/etc/nginx/sites-enabled/ningi`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ningi.dev www.ningi.dev _;

    root /home/marsc/sites/ningi-portfolio/site;
    index index.html;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    access_log /var/log/nginx/ningi.access.log;
    error_log  /var/log/nginx/ningi.error.log;
}
```

- Static site only — no TLS termination on this box (likely handled upstream or pending cert setup)
- No HTTPS redirect configured as of 2026-04-16

### Sites on disk

Located under `/home/marsc/sites/`:

| Directory | Description |
|-----------|-------------|
| `ningi-portfolio/` | Live portfolio site at ningi.dev |
| `homelab-security-research/` | Security research site (not currently served via nginx) |

---

## Security

### Wazuh Agent
- Agent registered and reporting to a Wazuh manager (likely on argus or fuji)
- Listening on ports 20201–20202
- Config expected at `/var/ossec/etc/ossec.conf`

### Access Control
- SSH restricted to Tailscale IP only (`100.117.14.55:2244`)
- AppArmor enabled
- Unattended security upgrades active

### Exposure
- Only port 80 is publicly reachable on the GCP external IP
- All management access (SSH) is Tailscale-gated

---

## Homelab Role

```
Internet
    │
    ▼
 GCP external IP
    │  :80
    ▼
  nginx ──► /home/marsc/sites/ningi-portfolio/site  (ningi.dev)
    
Tailscale mesh
    │
    ▼
 margo-1 (100.117.14.55)
    │
    ├── SSH :2244  ◄── argus / local machines
    └── Wazuh agent ──► Wazuh manager (homelab)
```

---

## Tags
#homelab #host #gcp #debian #nginx #wazuh #tailscale #public-site
