# Runbook — Argus Health Check

> Quick triage sequence to verify argus is healthy. Run this after reboots, after making changes, or when something seems off.

---

## Quick Health Check

Run this first — gets you an overview in under 30 seconds:

```bash
docker ps -a
docker stats --no-stream
df -h
free -h
uptime
tailscale status
sudo ufw status verbose
sudo ss -tulpn
journalctl -p err -n 50 --no-pager
systemctl status znc oidentd wazuh-agent wazuh-realtime --no-pager
```

---

## Stack Health

### Check all Docker stacks

```bash
cd ~/arrrs && docker compose ps
cd ~/infrastructure && docker compose ps
cd ~/wazuh-docker/single-node && docker compose ps
```

All containers should show `Up`. If anything is `Exited`, check logs:

```bash
docker logs <container_name> --tail 100
```

### Wazuh specifically

```bash
docker ps | grep wazuh
curl -k https://100.105.93.66:8443   # should return HTML — dashboard is up
docker logs wazuh.manager --tail 100
docker logs wazuh.dashboard --tail 100
docker logs wazuh.indexer --tail 100
```

### Restic backup health

```bash
printf 'bb254530bb\n' | sudo -S env HOME=/root bash -lc '
  source /home/t/.config/restic/argus/env
  restic snapshots
'
```

Confirms the fuji-backed restic repository is reachable and lists available snapshots.

---

## Firewall and Listener Verification

```bash
sudo ufw status verbose
sudo ss -ltnp    # TCP listeners
sudo ss -lunp    # UDP listeners
```

Cross-reference against the expected listener table in `Homelab/Hosts/argus.md`. Any unexpected listener is worth investigating.

---

## Storage Check

```bash
df -h
mount | grep mergerfs
ls /mnt/disk1 /mnt/disk2 /data
sudo smartctl -a /dev/sda
sudo smartctl -a /dev/sdb
```

If `/data` is not mounted or mergerfs is not listed, media services will be broken. Check `dmesg` for disk errors.

---

## Restart Commands

```bash
# Media stack
cd ~/arrrs && docker compose up -d

# Infrastructure (NPM, Watchtower, Grafana)
cd ~/infrastructure && docker compose up -d

# Wazuh stack
cd ~/wazuh-docker/single-node && docker compose up -d

# Host services
sudo systemctl restart znc
sudo systemctl restart oidentd
sudo systemctl restart wazuh-agent
sudo systemctl restart wazuh-realtime
```

---

## SSH into argus

```bash
# From LAN
ssh t@192.168.0.155 -p 2233

# From Tailscale
ssh t@100.105.93.66 -p 2233

# From operator workstation alias (if configured)
ssh t@argus
```

---

## Tags
#homelab #runbook #argus #health-check
