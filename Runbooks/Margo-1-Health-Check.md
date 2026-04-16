# Runbook — Margo-1 Health Check

> Quick triage for the GCP portfolio site host. SSH is Tailscale-only.

---

## SSH to margo-1

```bash
ssh marsc@100.117.14.55 -p 2244
```

---

## Quick Health Check

```bash
sudo systemctl status nginx wazuh-agent ssh --no-pager
sudo ss -tulpn
tailscale status
journalctl -p err -n 50 --no-pager
```

---

## Site Health

```bash
# nginx status
sudo systemctl status nginx --no-pager
sudo nginx -t

# Recent nginx errors
sudo tail -n 40 /var/log/nginx/ningi.error.log

# Confirm site files exist
ls -la /home/marsc/sites/ningi-portfolio/site/

# Recent update log
sudo tail -n 40 /var/log/ningi-update.log
```

External check (from argus or local machine):

```bash
curl -I https://research.ningi.dev
# Should return HTTP 200 with Cloudflare headers
```

---

## Wazuh Agent Health

```bash
sudo systemctl status wazuh-agent --no-pager
sudo tail -n 50 /var/ossec/logs/ossec.log
grep "<address>" /var/ossec/etc/ossec.conf
# Should show: 100.105.93.66
```

---

## Trigger a Manual Site Rebuild

```bash
cd /home/marsc/sites/ningi-portfolio
bash update.sh 2>&1 | tee /tmp/manual-rebuild.log
```

---

## Restart Commands

```bash
sudo systemctl restart nginx
sudo systemctl restart wazuh-agent
```

---

## Key Gotchas

- The VM sees internal IP `10.128.0.3` — not the public IP `35.208.42.252` (GCP NAT)
- `default-allow-ssh` GCP firewall rule may exist even if sshd isn't on port 22
- Cloudflare SSL mode must be **Full** or **Full Strict** — check the Cloudflare dashboard if HTTPS is broken
- SSH is **Tailscale-only** — if Tailscale is down on margo-1, use GCP console access

---

## Tags
#homelab #runbook #margo-1 #health-check #nginx #wazuh
