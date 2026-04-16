# Nginx Proxy Manager (NPM)

> Handles all public HTTP/HTTPS ingress for argus — reverse proxying, TLS termination, and Let's Encrypt certificate management. Runs in `~/infrastructure/docker-compose.yml`.

---

## What is a Reverse Proxy?

A reverse proxy sits between the internet and your internal services. Clients connect to the proxy's public IP — the proxy determines which backend service should handle the request and forwards it internally.

```
Internet client
      │
      ▼
argus public IP :443 (NPM)
      │
      ├── ningi.dev        ──► internal service A
      ├── plex.ningi.dev   ──► Plex :32400
      └── other.ningi.dev  ──► internal service B
```

Benefits:
- One public IP serves many services using virtual hosting and SNI
- TLS is terminated once at NPM — internal services use plain HTTP
- Internal services never handle raw internet traffic directly

---

## Deployment

| Setting | Value |
|---------|-------|
| Compose stack | `~/infrastructure/docker-compose.yml` |
| Config/data path | `~/infrastructure/npm/` |
| HTTP port | 80 — Public IPv4 + `2001:8003:e133:7500:3::1` |
| HTTPS port | 443 — Public IPv4 + `2001:8003:e133:7500:3::1` |
| Admin UI port | 81 — **Tailscale only** |

---

## Exposure Model

### What IS publicly reachable

| Address | Ports |
|---------|-------|
| argus public IPv4 `1.156.160.89` | 80, 443 |
| `2001:8003:e133:7500:3::1` (IPv6) | 80, 443 |

### What is NOT publicly reachable

| Resource | Reason |
|----------|---------|
| NPM admin UI `:81` | Tailscale only — never exposed via public forward or public IPv6 |
| Any other NPM-proxied services | Only services with explicit proxy host entries are reachable |

### IPv6 exposure specifics

NPM binds only `2001:8003:e133:7500:3::1` for ports 80 and 443. Broad IPv6 allow rules were removed after confirming NPM's exact bind scope. Ordered UFW IPv6 rules enforce this — the rest of the subnet is denied.

---

## DNS and Domains

| Domain | Managed by | Points to |
|--------|-----------|-----------|
| `ningi.dev` | Cloudflare | argus via NPM |
| DuckDNS subdomains | DuckDNS | argus public IP (updated by `ip-reporter.sh`) |

DuckDNS subdomains in use: `ningi-plex`, `ningi-over`, `ningi-lab`.

---

## TLS Certificates

NPM uses **Let's Encrypt** via the ACME protocol to issue and renew certificates automatically. Requirements for this to work:
- The domain must resolve to the argus public IP
- Port 80 must be reachable from the internet (for HTTP-01 validation)

If a certificate fails to renew, check that DNS is still pointing at the correct IP and that port 80 is not blocked upstream.

---

## Default Dashboard Removal

The NPM default dashboard page (`/dashboard.html`) is **intentionally absent** from the live host. If you rebuild NPM from scratch, remove the default page — it should not appear on the public address.

---

## Key Concepts for Learning

### What is SNI?
Server Name Indication — a TLS extension that lets the client tell the server which hostname it's connecting to before the TLS handshake completes. This is how NPM routes `plex.ningi.dev` and `seerr.ningi.dev` to different backends on the same IP and port (:443).

### What is TLS termination?
Decrypting the HTTPS connection at the proxy and forwarding plain HTTP internally. The external client always sees HTTPS; the internal network uses HTTP. Reduces the need to manage certificates on every individual service.

### What is HTTP-01 validation?
The most common Let's Encrypt challenge type. Let's Encrypt makes an HTTP request to `http://<your-domain>/.well-known/acme-challenge/<token>`. NPM places the response there. This proves you control the domain. Requires port 80 to be publicly reachable.

---

## Gotchas

- `argus` is no longer in the DMZ. A Docker publish on `eno1` is not automatically public — it requires an explicit router forward or IPv6 allow. Don't assume a new proxied service is internet-reachable without confirming from fuji recon.
- NPM admin `:81` must never appear in public forwards or public IPv6 rules — it exposes admin functions with no second authentication layer.
- Old stale Cloudflare `A` records (e.g. `seerr.ningi.dev → 1.156.234.26`) can persist after config changes. Verify DNS cleanup via fuji recon after making Cloudflare changes.

---

## Access

| Resource | URL |
|----------|-----|
| NPM Admin | `http://100.105.93.66:81` |

---

## Restart

```bash
cd ~/infrastructure && docker compose up -d
```

---

## Tags
#homelab #service #npm #nginx #reverse-proxy #tls #argus
