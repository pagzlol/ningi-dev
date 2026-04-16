# Runbook — Fuji Health Check

> Quick triage sequence to verify fuji is healthy. Run this after changes, after fail2ban config updates, or if Wazuh stops receiving fuji events on argus.

---

## SSH to fuji

```bash
# Always via Tailscale
ssh troy@100.119.8.6 -p 2233
```

> Real SSH is Tailscale-only — UFW enforces this. Port 22 is Cowrie. Do not attempt to SSH on port 22.

---

## Quick Health Check

```bash
sudo systemctl status cowrie wazuh-agent fail2ban auditd --no-pager
sudo ss -tulpn
tailscale status
sudo ufw status verbose
journalctl -p err -n 50 --no-pager
```

---

## Cowrie Health

```bash
# Service status
sudo systemctl status cowrie --no-pager

# Recent log entries (live honeypot activity)
tail -n 50 /home/cowrie/cowrie/var/log/cowrie/cowrie.json | python3 -m json.tool | head -100

# Count today's sessions
grep -c "cowrie.session.connect" /home/cowrie/cowrie/var/log/cowrie/cowrie.json
```

If Cowrie is not running, check the socket:

```bash
sudo systemctl status cowrie.socket --no-pager
sudo journalctl -u cowrie -n 50 --no-pager
```

---

## Wazuh Agent Health

```bash
sudo systemctl status wazuh-agent --no-pager
sudo tail -n 50 /var/ossec/logs/ossec.log

# Verify manager address is correct
grep "<address>" /var/ossec/etc/ossec.conf
# Should show: 100.105.93.66
```

If the agent is disconnected, verify Tailscale connectivity to argus:

```bash
tailscale status
nc -zv 100.105.93.66 1514
```

---

## fail2ban Health

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client status
```

> **Watch for Tailscale IPs in the ban list.** If a Tailscale client IP gets banned, you'll lose SSH access. Unban with:
> ```bash
> sudo fail2ban-client set sshd unbanip <IP>
> ```

---

## Recon Stack Health

```bash
# Check last run time
ls -la ~/recon/scans/latest

# Check cron is scheduled
crontab -l | grep recon

# Check home IP is fresh (should be <15 min old)
cat ~/.home_public_ip
stat ~/.home_public_ip

# View last monitor run log
tail -n 50 ~/recon/monitor-cron.log
```

---

## Honeytoken Verification

```bash
# Confirm honeytoken files exist
sudo ls -la /root/.aws/credentials
ls -la /home/cowrie/.ssh/id_rsa_backup

# Confirm auditd is watching them
sudo auditctl -l | grep honeytoken
```

---

## Restart Commands

```bash
sudo systemctl restart cowrie
sudo systemctl restart wazuh-agent
sudo systemctl restart fail2ban
sudo systemctl restart auditd
```

---

## Tags
#homelab #runbook #fuji #health-check #cowrie #wazuh
