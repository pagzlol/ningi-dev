# Runbook — Docker Stack Recovery

> Procedures for recovering Docker stacks on argus after a crash, reboot, or bad config change. Covers all three stacks independently.

---

## Stack Reference

| Stack | Path | Key services |
|-------|------|-------------|
| Media | `~/arrrs/` | Plex, Sonarr, Radarr, Lidarr, Prowlarr, Seerr, qBittorrent, SABnzbd |
| Infrastructure | `~/infrastructure/` | NPM, Watchtower, Grafana |
| Wazuh | `~/wazuh-docker/single-node/` | Wazuh manager, indexer, dashboard |

---

## General Triage

Run this first to understand the current state:

```bash
docker ps -a                    # show all containers including stopped
docker stats --no-stream        # resource usage snapshot
journalctl -p err -n 50 --no-pager   # system-level errors
```

For a specific container that exited unexpectedly:

```bash
docker logs <container_name> --tail 100
docker inspect <container_name> | grep -A5 '"State"'
```

---

## Restart a Single Container

```bash
docker restart <container_name>
```

If it won't restart:

```bash
docker rm <container_name>
# Then bring the full stack back up:
cd ~/arrrs && docker compose up -d
```

---

## Media Stack Recovery (`~/arrrs/`)

```bash
cd ~/arrrs

# View current state
docker compose ps

# Restart everything
docker compose up -d

# Restart one service only
docker compose up -d sonarr

# Full stop and start (harder reset)
docker compose down
docker compose up -d
```

> **Do not use `docker compose down -v`** — this removes named volumes and will wipe config data.

### If media is not accessible after restart

Check storage first:

```bash
df -h
mount | grep mergerfs
ls /mnt/disk1 /mnt/disk2 /data
```

If `/data` is not mounted, mergerfs needs to be remounted before starting the stack. Check `dmesg` for disk errors.

---

## Infrastructure Stack Recovery (`~/infrastructure/`)

```bash
cd ~/infrastructure
docker compose ps
docker compose up -d
```

If NPM is down, the public site ingress is broken. After bringing NPM back up, verify:

```bash
curl -I https://ningi.dev
curl -I http://100.105.93.66   # should redirect to HTTPS
```

---

## Wazuh Stack Recovery (`~/wazuh-docker/single-node/`)

```bash
cd ~/wazuh-docker/single-node
docker compose ps
docker compose up -d
```

Wazuh takes 30–60 seconds to fully initialise. Watch logs until ready:

```bash
docker logs wazuh.manager --tail 50 -f
# Wait for: "Wazuh is now running."
```

Verify dashboard is up:

```bash
curl -k https://100.105.93.66:8443
# Should return HTML
```

> **Impact:** While Wazuh is down, fuji and margo-1 agents are disconnected — no cross-host alert visibility. The wazuh-realtime.service will also fail to query OpenSearch and produce errors.

### After Wazuh recovery — verify custom rules are loaded

```bash
docker logs wazuh.manager --tail 200 | grep -i "rule\|error\|warn"
```

If custom rules failed to load, check for XML syntax errors:

```bash
# Inside the manager container:
docker exec wazuh.manager cat /var/ossec/logs/ossec.log | grep "ERROR" | tail -20
```

---

## Full Argus Reboot Recovery Sequence

After a reboot, Docker containers with `restart: unless-stopped` should come back automatically. Verify:

```bash
# Wait ~2 minutes after boot, then:
docker ps -a

# If anything is missing:
cd ~/arrrs && docker compose up -d
cd ~/infrastructure && docker compose up -d
cd ~/wazuh-docker/single-node && docker compose up -d

# Verify host services
sudo systemctl status znc oidentd wazuh-agent wazuh-realtime discord-bot --no-pager
```

---

## Key Concepts for Learning

### Why `restart: unless-stopped`?
Docker containers have a restart policy. `unless-stopped` means: restart automatically after crashes or reboots, but don't restart if you manually stopped it with `docker stop`. This is the correct policy for long-running homelab services.

### What is `docker compose down` vs `docker compose stop`?
- `docker compose stop` — stops containers but leaves them (and their volumes) intact. Fast to restart.
- `docker compose down` — stops and **removes** containers. Volumes survive unless you add `-v`. Use `down` when you need a clean slate; use `stop`/`up` for normal restarts.

### What are named volumes?
Docker volumes are where containers persist data outside their own filesystem. Named volumes (e.g. `grafana_data`) survive container removal. Anonymous volumes don't. Never run `docker compose down -v` on a production stack — it removes all volumes and wipes persistent data.

---

## Tags
#homelab #runbook #docker #argus #recovery
