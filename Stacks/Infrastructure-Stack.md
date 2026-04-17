# Infrastructure Stack

> Handles public ingress, reverse proxying, TLS termination, container auto-updates, and dashboarding for NINGI//LAB. All services live in a single compose file on argus.

---

## Stack Location

`~/infrastructure/docker-compose.yml`

---

## Service Inventory

| Service | Container | Port | Bind / Exposure | Purpose |
|---------|-----------|------|-----------------|---------|
| Nginx Proxy Manager | `nginx_proxy_manager` | 80, 443 | Public IPv4 + IPv6 `2001:8003:e133:7500:3::1` | Reverse proxy + TLS termination |
| NPM Admin UI | `nginx_proxy_manager` | 81 | Tailscale only (`100.105.93.66`) | NPM web admin — never publicly exposed |
| Watchtower | `media_watchtower` | — | none | Auto-updates all containers nightly at 04:00 |
| Grafana | `grafana` | 3000 | Tailscale (`100.105.93.66`) + LAN (`192.168.0.155`) | Dashboards and visualisations |

---

## Networks

```yaml
homelab:        external: true   # shared across all stacks
single-node_default: external: true  # joins Wazuh indexer network so Grafana can reach OpenSearch
```

Grafana attaches to both networks — it needs `single-node_default` to reach the Wazuh indexer at `host.docker.internal:9200`.

---

## Nginx Proxy Manager

NPM sits in front of all public-facing services on argus. It handles:

- HTTP → HTTPS redirects
- Let's Encrypt certificate issuance and renewal
- Routing incoming requests to the correct internal container/port

### IPv6 exposure

NPM binds `2001:8003:e133:7500:3::1` for ports 80 and 443 only. NPM admin `:81` is Tailscale-only and must never be forwarded publicly.

### Public ingress path

```
Internet ──► router/ISP ──► argus public IP
                                  │
                          NPM :80/:443
                                  │
              ┌───────────────────┤
              │                   │
         ningi.dev           n8n.ningi.dev
       (Cloudflare DNS)      (and others)
```

### Volume mounts

| Host path | Container path | Purpose |
|-----------|---------------|---------|
| `~/infrastructure/config/npm/data` | `/data` | NPM database + config |
| `~/infrastructure/config/npm/letsencrypt` | `/etc/letsencrypt` | TLS certs |
| `~/infrastructure/www` | `/var/www/html` | Static file serving |
| `~/infrastructure/npm-default.conf` | `/etc/nginx/conf.d/default.conf` | Custom nginx defaults |

---

## Watchtower

Monitors all running containers across all stacks for newer images. Runs on a cron schedule — `0 0 4 * * *` (04:00 daily). When a new image is found, it pulls and restarts the container automatically.

- `WATCHTOWER_CLEANUP=true` — removes old images after update
- `DOCKER_API_VERSION=1.44`
- Reads `/var/run/docker.sock` — watches all containers regardless of which compose file they came from

---

## Grafana

Provides dashboards across NINGI//LAB security and infrastructure data. Uses OpenSearch (Wazuh indexer) as its primary datasource.

- **Image:** `grafana/grafana-oss:latest`
- **Root URL:** `http://100.105.93.66:3000`
- **Plugin:** `grafana-opensearch-datasource` (installed at startup via `GF_INSTALL_PLUGINS`)
- **Secrets:** `~/infrastructure/grafana.env` (chmod 600) — contains `OPENSEARCH_USER`, `OPENSEARCH_PASS`
- **Provisioning:** `~/infrastructure/grafana/provisioning/` (datasources loaded at startup)
- **Dashboards:** `~/infrastructure/grafana/dashboards/` (provisioned from disk)

### Datasources

| Name | UID | URL | Index |
|------|-----|-----|-------|
| OpenSearch (Wazuh alerts) | `opensearch` | `https://host.docker.internal:9200` | `wazuh-alerts-4.x-*` |
| OpenSearch (Recon) | *(live)* | `https://host.docker.internal:9200` | `recon-surface-*` |

### Dashboards

| Dashboard | UID | Purpose |
|-----------|-----|---------|
| Cowrie — Attack Overview | `cowrie-overview` | Sessions over time, top IPs, countries, commands |
| Credential Attempts | `credential-attempts` | Top usernames, passwords, and pairs from honeypot |
| Recon - Attack Surface | *(live)* | Fuji recon scan output vs home public IP and ningi.dev |
| Unified Host View | `unified-host-view` | Per-host event counts, high-severity alerts, honeytoken triggers |

---

## Key Concepts for Learning

### What is a reverse proxy?
A reverse proxy sits between the internet and your internal services. The client talks to the proxy (which has the public IP), and the proxy forwards the request to the appropriate internal service. Benefits:
- One public IP serves many services via SNI/virtual hosting
- TLS can be terminated once at the proxy rather than on every service
- Internal services never handle raw internet traffic

### What is TLS termination?
HTTPS requires a TLS certificate and a private key. Terminating TLS means decrypting the HTTPS connection at the proxy and forwarding plain HTTP internally. The internal network uses plain HTTP while the client always sees HTTPS.

### What is Let's Encrypt?
A free, automated certificate authority. NPM uses the ACME protocol to request and renew certificates automatically — no manual cert management needed as long as the domain resolves to argus and port 80 is reachable for validation.

### What is SNI?
Server Name Indication — a TLS extension that tells the server which hostname the client is connecting to before the TLS handshake completes. This is how NPM can route `plex.ningi.dev` and `n8n.ningi.dev` to different backends on the same IP and port.

### What is dashboard provisioning?
Rather than clicking through the Grafana UI to create datasources and dashboards, provisioning defines them in YAML/JSON files that Grafana reads at startup. This means they can be version-controlled and recreated from scratch automatically.

---

## Access

| Resource | URL |
|----------|-----|
| NPM Admin | `http://100.105.93.66:81` |
| Grafana | `http://100.105.93.66:3000` |

---

## Restart Commands

```bash
# Full stack
cd ~/infrastructure && docker compose up -d

# Individual services
cd ~/infrastructure && docker compose up -d grafana
cd ~/infrastructure && docker compose up -d nginx-proxy-manager
cd ~/infrastructure && docker compose up -d watchtower
```

---

## Tags
#homelab #stack #infrastructure #npm #nginx #watchtower #grafana #opensearch #argus #tls
