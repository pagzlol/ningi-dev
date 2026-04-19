# Loki Stack

> Second log ingestion path alongside Wazuh. Wazuh does security correlation and alerting — Loki gives you raw log exploration across all hosts in Grafana's Explore view using LogQL.

---

## What Problem This Solves

Wazuh is purpose-built for detection. It normalises events and fires rules — it is not designed for "show me everything that happened on fuji between 02:00 and 02:15". Loki fills that gap:

- Full raw log tailing across all three hosts
- Docker container stdout (argus media/infra stacks)
- Cowrie JSON events with structured field extraction (`eventid`, `src_ip`)
- Nginx access/error logs from margo-1
- Recon cron output from fuji
- auditd raw events from fuji
- Free-text search across everything with LogQL

Wazuh pipeline is **unchanged**. These are two independent ingestion paths.

---

## Architecture

```
┌──── argus ────────────────────────────────────────────────────────┐
│                                                                    │
│  Loki :3100  ◄───────────────────────────────────────────────┐    │
│     │                                                         │    │
│  Grafana :3000                                                │    │
│     ├── OpenSearch datasource (Wazuh alerts — unchanged)      │    │
│     └── Loki datasource (raw logs — NEW)                      │    │
│                                                               │    │
│  promtail (Docker) ────────────────────────────────────────────┘   │
│    /var/log/syslog, auth.log                                       │
│    docker container logs (all stacks)                              │
└────────────────────────────────────────────────────────────────────┘
          ▲                              ▲
  promtail (fuji)                promtail (margo-1)
  bare metal / systemd           bare metal / systemd
  /var/log/syslog                /var/log/syslog
  /var/log/auth.log              /var/log/auth.log
  /var/log/audit/audit.log       /var/log/nginx/*.log
  cowrie JSON log                /var/log/ningi-update.log
  recon monitor-cron.log
```

---

## Stack Location

| Component | Path | Host |
|-----------|------|------|
| Loki container | `~/infrastructure/docker-compose.yml` | argus |
| Loki config | `~/infrastructure/loki/config.yml` | argus |
| Argus promtail config | `~/infrastructure/promtail/config.yml` | argus |
| Grafana Loki datasource | `~/infrastructure/grafana/provisioning/datasources/loki.yml` | argus |
| Fuji promtail config | `/etc/promtail/config.yml` | fuji |
| Fuji promtail binary | `/usr/local/bin/promtail` | fuji |
| Fuji systemd unit | `/etc/systemd/system/promtail.service` | fuji |
| Margo-1 promtail config | `/etc/promtail/config.yml` | margo-1 |
| Margo-1 promtail binary | `/usr/local/bin/promtail` | margo-1 |
| Margo-1 systemd unit | `/etc/systemd/system/promtail.service` | margo-1 |

---

## Deployment

### 1. Argus — UFW rule (allow Tailscale peers to push to Loki)

```bash
sudo ufw allow in on tailscale0 to any port 3100 proto tcp comment "Loki ingestion from Tailscale"
```

### 2. Argus — Loki config

Create `~/infrastructure/loki/config.yml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 4
  ingestion_burst_size_mb: 8
  retention_period: 720h    # 30 days
```

### 3. Argus — Promtail config

Create `~/infrastructure/promtail/config.yml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: syslog
    static_configs:
      - targets: [localhost]
        labels:
          host: argus
          job: syslog
          __path__: /var/log/syslog

  - job_name: auth
    static_configs:
      - targets: [localhost]
        labels:
          host: argus
          job: auth
          __path__: /var/log/auth.log

  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 10s
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
      - labels:
          stream:
      - output:
          source: output
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        regex: '/(.*)'
        target_label: container
      - source_labels: [__meta_docker_compose_service]
        target_label: service
      - source_labels: [__meta_docker_container_label_com_docker_compose_project]
        target_label: stack
      - target_label: host
        replacement: argus
```

### 4. Argus — Add to `~/infrastructure/docker-compose.yml`

```yaml
  loki:
    image: grafana/loki:3.5.0
    ports:
      - "0.0.0.0:3100:3100"
    volumes:
      - loki-data:/loki
      - ./loki/config.yml:/etc/loki/config.yml:ro
    command: -config.file=/etc/loki/config.yml
    restart: unless-stopped

  promtail:
    image: grafana/promtail:3.5.0
    volumes:
      - ./promtail/config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    depends_on:
      - loki
```

Add to the `volumes:` block at the bottom:
```yaml
  loki-data:
```

### 5. Argus — Grafana Loki datasource

Create `~/infrastructure/grafana/provisioning/datasources/loki.yml`:

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    uid: loki
    url: http://localhost:3100
    access: proxy
    isDefault: false
    jsonData:
      maxLines: 1000
```

> Note: Grafana uses `network_mode: host` so it reaches the published Loki port at `localhost:3100`.

### 6. Argus — Deploy

```bash
cd ~/infrastructure
docker compose up -d loki promtail
docker compose restart grafana   # pick up new datasource provisioning
```

---

### 7. Fuji — Install promtail binary

```bash
# on fuji
PROMTAIL_VERSION=3.5.0
curl -LO "https://github.com/grafana/loki/releases/download/v${PROMTAIL_VERSION}/promtail-linux-amd64.zip"
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
sudo chmod +x /usr/local/bin/promtail

# create service user and required dirs
sudo useradd --system --no-create-home --shell /bin/false promtail
sudo usermod -aG adm promtail        # read /var/log/syslog, auth.log
sudo usermod -aG adm promtail        # already covered
# audit log — adm group usually covers this; if not:
# sudo usermod -aG audit promtail
# cowrie logs — need read access
sudo setfacl -R -m u:promtail:r /home/cowrie/cowrie/var/log/cowrie/
sudo setfacl -R -d -m u:promtail:r /home/cowrie/cowrie/var/log/cowrie/

sudo mkdir -p /var/lib/promtail
sudo chown promtail:promtail /var/lib/promtail
```

### 8. Fuji — Promtail config

Create `/etc/promtail/config.yml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://100.105.93.66:3100/loki/api/v1/push

scrape_configs:
  - job_name: syslog
    static_configs:
      - targets: [localhost]
        labels:
          host: fuji
          job: syslog
          __path__: /var/log/syslog

  - job_name: auth
    static_configs:
      - targets: [localhost]
        labels:
          host: fuji
          job: auth
          __path__: /var/log/auth.log

  - job_name: auditd
    static_configs:
      - targets: [localhost]
        labels:
          host: fuji
          job: auditd
          __path__: /var/log/audit/audit.log

  - job_name: cowrie
    static_configs:
      - targets: [localhost]
        labels:
          host: fuji
          job: cowrie
          __path__: /home/cowrie/cowrie/var/log/cowrie/cowrie.json
    pipeline_stages:
      - json:
          expressions:
            eventid: eventid
            src_ip: src_ip
            session: session
      - labels:
          eventid:
          src_ip:

  - job_name: recon
    static_configs:
      - targets: [localhost]
        labels:
          host: fuji
          job: recon
          __path__: /home/troy/recon/monitor-cron.log
```

### 9. Fuji — Systemd unit

Create `/etc/systemd/system/promtail.service`:

```ini
[Unit]
Description=Promtail log shipper
After=network-online.target
Wants=network-online.target

[Service]
User=promtail
Group=promtail
ExecStart=/usr/local/bin/promtail -config.file=/etc/promtail/config.yml
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now promtail
sudo systemctl status promtail
```

---

### 10. Margo-1 — Install promtail (same binary install as fuji)

```bash
# on margo-1 (user: marsc)
PROMTAIL_VERSION=3.5.0
curl -LO "https://github.com/grafana/loki/releases/download/v${PROMTAIL_VERSION}/promtail-linux-amd64.zip"
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
sudo chmod +x /usr/local/bin/promtail

sudo useradd --system --no-create-home --shell /bin/false promtail
sudo usermod -aG adm promtail        # /var/log/syslog, auth.log
sudo usermod -aG www-data promtail   # /var/log/nginx/

sudo mkdir -p /var/lib/promtail
sudo chown promtail:promtail /var/lib/promtail
```

### 11. Margo-1 — Promtail config

Create `/etc/promtail/config.yml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://100.105.93.66:3100/loki/api/v1/push

scrape_configs:
  - job_name: syslog
    static_configs:
      - targets: [localhost]
        labels:
          host: margo-1
          job: syslog
          __path__: /var/log/syslog

  - job_name: auth
    static_configs:
      - targets: [localhost]
        labels:
          host: margo-1
          job: auth
          __path__: /var/log/auth.log

  - job_name: nginx
    static_configs:
      - targets: [localhost]
        labels:
          host: margo-1
          job: nginx
          service: research-site
          __path__: /var/log/nginx/{ningi.access.log,ningi.error.log}

  - job_name: site-update
    static_configs:
      - targets: [localhost]
        labels:
          host: margo-1
          job: site-update
          __path__: /var/log/ningi-update.log
```

### 12. Margo-1 — Systemd unit

Same unit file as fuji. Deploy identically:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now promtail
```

---

## Access

| Resource | URL |
|----------|-----|
| Loki API | `http://100.105.93.66:3100` (Tailscale) |
| Grafana Explore → Loki | `http://100.105.93.66:3000` → Explore → select Loki |

---

## LogQL Quick Reference

```logql
# Everything from fuji in the last hour
{host="fuji"}

# All SSH auth failures across all hosts
{job="auth"} |~ "Failed password"

# Cowrie — only file uploads
{host="fuji", job="cowrie"} | json | eventid = "cowrie.session.file_upload"

# Cowrie — a specific attacker IP
{host="fuji", job="cowrie"} | json | src_ip = "1.2.3.4"

# Cowrie — high-signal commands (persistence attempts)
{host="fuji", job="cowrie"} |~ "authorized_keys|chattr|redtail|rm -rf .ssh"

# Nginx access log — 4xx/5xx on margo-1
{host="margo-1", job="nginx"} |~ " [45][0-9]{2} "

# auditd on fuji — honeytoken file reads
{host="fuji", job="auditd"} |~ "honeytoken"

# All containers on argus for a specific stack
{host="argus", stack="arrrs"}

# Wazuh manager container logs
{host="argus", container="wazuh.manager"}

# Count cowrie sessions per hour (rate panel)
count_over_time({host="fuji", job="cowrie"} | json | eventid = "cowrie.session.connect" [1h])
```

---

## Resource Footprint

| Component | RAM | CPU | Disk |
|-----------|-----|-----|------|
| Loki (argus Docker) | ~150MB idle | <1% | ~500MB/month at current log volume |
| Promtail (argus Docker) | ~40MB | <1% | none |
| Promtail (fuji bare metal) | ~35MB | <1% | none |
| Promtail (margo-1 bare metal) | ~35MB | <1% | none |

---

## Restart Commands

```bash
# argus
cd ~/infrastructure && docker compose restart loki promtail

# fuji / margo-1
sudo systemctl restart promtail
```

---

## Gotchas

- **Cowrie log permissions on fuji:** promtail user needs ACL read access to `/home/cowrie/cowrie/var/log/cowrie/` — the `cowrie` user owns those files.
- **auditd on fuji:** if `adm` group doesn't cover `/var/log/audit/audit.log`, add promtail to the `audit` group.
- **Grafana network:** Grafana runs `network_mode: host` so the Loki datasource URL must be `http://localhost:3100`, not the container name.
- **Loki port on argus:** the UFW rule scopes port 3100 to `tailscale0` only — fuji and margo-1 push over Tailscale so this is sufficient.
- **margo-1 nginx logs:** confirm `/var/log/nginx/ningi.access.log` exists on the live host before relying on it — GCP nginx may log to a different path.

---

## Tags
#homelab #stack #loki #promtail #logging #grafana #argus #fuji #margo-1
