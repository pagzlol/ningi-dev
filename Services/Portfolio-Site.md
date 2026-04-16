# research.ningi.dev — Portfolio Site

> Static MkDocs Material site served by nginx on margo-1. Publicly accessible at `https://research.ningi.dev`. Acts as the public-facing security research and homelab portfolio.

---

## Deployment

| Setting | Value |
|---------|-------|
| Host | margo-1 (GCP `e2-micro`, `us-central1`) |
| Site root | `/home/marsc/sites/ningi-portfolio/` |
| Generator | MkDocs `1.6.1` |
| Theme | Material `9.7.6` |
| Web server | nginx (systemd) |
| nginx config | `/etc/nginx/sites-available/ningi` |
| Update script | `/home/marsc/sites/ningi-portfolio/update.sh` |
| Update log | `/var/log/ningi-update.log` |
| Rebuild schedule | Daily at 03:00 UTC (cron) |

---

## Source Repositories

The site pulls content from two GitHub repos at rebuild time:

| Repo | Content |
|------|---------|
| `pagzlol/homelab-security-research` | Public incident writeups and research notes |
| `pagzlol/ningi-homelab-ai-md` | Homelab infrastructure documentation |

---

## Public Access Path

```
Browser
   │
   ▼
Cloudflare (DNS proxy + CDN)
   │
   ▼
margo-1 public IP 35.208.42.252
   │  :80
   ▼
nginx ──► /home/marsc/sites/ningi-portfolio/site/
```

- nginx listens on port 80 (origin)
- Cloudflare handles HTTPS termination externally
- The VM sees internal GCP IP `10.128.0.3`, not the public static IP (GCP NAT)

> **Cloudflare SSL mode:** must be **Full** or **Full Strict** — not Flexible. Verify in the Cloudflare dashboard. Flexible mode would send unencrypted traffic between Cloudflare and the origin and is not appropriate.

---

## Admin Access

```bash
# SSH to margo-1 via Tailscale
ssh marsc@100.117.14.55 -p 2244
```

SSH is bound to Tailscale only (`2244/tcp`). GCP's `default-allow-ssh` firewall rule may exist but SSH does not listen on port 22 — do not rely on GCP direct SSH.

---

## Key Concepts for Learning

### What is MkDocs Material?
A static site generator designed for documentation. You write content in Markdown, configure navigation in `mkdocs.yml`, and MkDocs builds a polished HTML site ready to serve. Material is the most popular theme — clean, searchable, mobile-friendly.

### What is a static site?
A site that consists entirely of pre-built HTML, CSS, and JavaScript files — no server-side processing or database. Static sites are fast, cheap to host, and have a tiny attack surface (no PHP, no SQL injection surface, no server-side code execution). The entire site is rebuilt from source on each update.

### What is Cloudflare proxying?
When Cloudflare proxies your domain (the orange cloud in the DNS dashboard), traffic goes through Cloudflare's network rather than directly to your origin IP. Benefits: DDoS protection, CDN caching, hides your real IP, free HTTPS. The origin IP (`35.208.42.252`) should ideally not be publicly known.

### Why separate the public site onto margo-1?
Public web traffic carries risk — scanners, bots, exploit attempts. Keeping it on a separate GCP VM (not argus) means a compromise of the web host doesn't expose the home network, Wazuh stack, media library, or IRC bouncer. Isolation is a basic defence-in-depth principle.

---

## Troubleshooting

```bash
# On margo-1 (ssh marsc@100.117.14.55 -p 2244)
sudo systemctl status nginx --no-pager
sudo nginx -t
sudo tail -n 40 /var/log/nginx/ningi.error.log
sudo tail -n 40 /var/log/ningi-update.log
```

---

## Tags
#homelab #service #margo-1 #mkdocs #portfolio #nginx #cloudflare
