# Infrastructure Stack

> Handles public ingress, reverse proxying, TLS termination, and container lifecycle management for argus.

---

## Stack Location

`~/infrastructure/docker-compose.yml`

---

## Service Inventory

| Service | Port | Bind / Exposure | Purpose |
|---------|------|-----------------|---------|
| Nginx Proxy Manager (NPM) | 80, 443 | Public IPv4 + `2001:8003:e133:7500:3::1` | Reverse proxy + TLS termination |
| NPM Admin UI | 81 | Tailscale only | NPM web admin — never publicly exposed |
| Watchtower | — | none | Auto-updates all containers |

---

## Nginx Proxy Manager

NPM sits in front of all public-facing services on argus. It handles:

- HTTP → HTTPS redirects
- Let's Encrypt certificate issuance and renewal
- Routing incoming requests to the correct internal container/port

### What NPM does NOT do on argus

The default NPM dashboard page (`/dashboard.html`) is intentionally **absent** from the live host — it should not appear on the public address.

### Public ingress path

```
Internet ──► router/ISP ──► argus public IP
                                  │
                          NPM :80/:443
                                  │
              ┌───────────────────┤
              │                   │
         ningi.dev           other proxied
       (Cloudflare DNS)         services
```

### IPv6 exposure

NPM binds `2001:8003:e133:7500:3::1` for ports 80 and 443 only. Broad IPv6 allow rules have been removed — exposure is per-address via ordered UFW IPv6 rules. NPM admin `:81` must stay off public forwards and public IPv6.

---

## Watchtower

Monitors all running containers for newer images on a schedule. When found, pulls and restarts the container automatically. Runs in `~/infrastructure/` alongside NPM.

---

## Key Concepts for Learning

### What is a reverse proxy?
A reverse proxy sits between the internet and your internal services. The client talks to the proxy (which has the public IP), and the proxy forwards the request to the appropriate internal service. Benefits:
- One public IP serves many services (via virtual hosting / SNI)
- TLS can be terminated once at the proxy rather than on every service
- Internal services never need to handle raw internet traffic

### What is TLS termination?
HTTPS requires a TLS certificate and a private key. "Terminating" TLS means decrypting the HTTPS connection at the proxy and forwarding plain HTTP internally. The internal network uses plain HTTP while the client always sees HTTPS.

### What is Let's Encrypt?
A free, automated certificate authority. NPM uses the ACME protocol to request and renew certificates automatically — no manual cert management needed as long as the domain resolves to argus and port 80 is reachable for validation.

### What is SNI?
Server Name Indication — a TLS extension that tells the server which hostname the client is connecting to before the TLS handshake completes. This is how a reverse proxy can route `plex.ningi.dev` and `seerr.ningi.dev` to different backends on the same IP and port.

---

## Access

| Resource | URL |
|----------|-----|
| NPM Admin | `http://100.105.93.66:81` |

---

## Restart Commands

```bash
cd ~/infrastructure && docker compose up -d
```

---

## Tags
#homelab #stack #infrastructure #npm #nginx #watchtower #argus #tls
