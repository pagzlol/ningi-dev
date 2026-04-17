# n8n Stack

> Self-hosted workflow automation platform running on argus. Handles webhooks, integrations, and automated pipelines. Proxied via NPM at `n8n.ningi.dev` with HTTPS.

---

## Stack Location

`~/n8n/docker-compose.yml`

---

## Service Inventory

| Service | Container | Port | Bind / Exposure | Purpose |
|---------|-----------|------|-----------------|---------|
| n8n | `n8n` | 5678 | Internal only (NPM proxied) | Workflow automation UI and engine |

n8n is not directly exposed. All traffic enters via NPM → `n8n.ningi.dev` → container `:5678`.

---

## Configuration

```yaml
image: n8nio/n8n:latest
container_name: n8n
restart: unless-stopped
```

### Environment

| Variable | Value | Purpose |
|----------|-------|---------|
| `N8N_HOST` | `n8n.ningi.dev` | Public hostname |
| `N8N_PORT` | `5678` | Internal container port |
| `N8N_PROTOCOL` | `https` | Tells n8n it's behind HTTPS proxy |
| `N8N_SECURE_COOKIE` | `true` | Enforces secure cookies (required for HTTPS) |
| `WEBHOOK_URL` | `https://n8n.ningi.dev/` | Base URL for inbound webhooks |
| `N8N_EDITOR_BASE_URL` | `https://n8n.ningi.dev/` | UI base URL |
| `N8N_PROXY_HOPS` | `1` | Tells n8n there's one proxy hop (NPM) before it |
| `GENERIC_TIMEZONE` | `Australia/Brisbane` | Cron and scheduler timezone |

### Volume

| Volume | Mount | Purpose |
|--------|-------|---------|
| `n8n_data` | `/home/node/.n8n` | Workflows, credentials, execution history |

### Network

```yaml
networks:
  homelab:
    external: true
```

Joins the shared `homelab` network — can reach other stack containers by name if needed.

---

## NPM Proxy Setup

n8n sits behind NPM with TLS termination:

```
Internet ──► NPM :443 (n8n.ningi.dev)
                  │
            plain HTTP
                  │
          n8n container :5678
```

NPM handles the Let's Encrypt certificate for `n8n.ningi.dev`. The `N8N_PROXY_HOPS=1` and `N8N_PROTOCOL=https` settings ensure n8n correctly handles the proxied HTTPS connection — without these, webhooks and redirects generate wrong URLs.

---

## Key Concepts for Learning

### What is n8n?
An open-source workflow automation tool — similar to Zapier or Make, but self-hosted. You build visual workflows that connect triggers (webhooks, cron jobs, events) to actions (HTTP requests, file operations, API calls, Discord messages, etc.).

### What is a webhook?
An HTTP endpoint that another service calls when something happens. Instead of polling "did anything change?", the remote service pushes the event to your URL immediately. n8n can receive webhooks and trigger workflows from them.

### Why `N8N_PROXY_HOPS=1`?
When n8n is behind a reverse proxy, it receives requests from NPM (not directly from the internet). Without this setting, n8n sees the internal IP of NPM as the client IP and generates URLs based on the internal host. `PROXY_HOPS=1` tells n8n to trust one layer of `X-Forwarded-*` headers from the proxy, so it sees the real client IP and generates correct public URLs.

### Why `N8N_SECURE_COOKIE=true`?
Since n8n is accessed over HTTPS (via NPM), cookies must have the `Secure` flag set — browsers will reject session cookies without it on HTTPS connections. This setting is required when running behind an HTTPS proxy.

---

## Access

| Resource | URL |
|----------|-----|
| n8n Editor | `https://n8n.ningi.dev` |

---

## Restart Commands

```bash
cd ~/n8n && docker compose up -d
```

---

## Tags
#homelab #stack #n8n #automation #workflows #webhooks #argus #npm
