# Monitoring Stack

> Provides real-time visibility into health, performance, and resource usage across NINGI//LAB using Grafana + OpenSearch datasources.

---

## Stack Location

| Service | Compose path |
|---------|-------------|
| Grafana | `~/infrastructure/docker-compose.yml` |
| Grafana provisioning | `~/infrastructure/grafana/provisioning/` |
| Grafana dashboards | `~/infrastructure/grafana/dashboards/` |
| Grafana secrets | `~/infrastructure/grafana.env` (chmod 600) |

---

## Service Inventory

| Service | Port | Bind | Purpose |
|---------|------|------|---------|
| Grafana | 3000 | LAN + Tailscale | Dashboards and visualisations |
| OpenSearch | 9200 | localhost only | Backend data store (Wazuh indexer) |

Grafana runs with `network_mode: host` so it can reach OpenSearch at `localhost:9200` directly. Version: **grafana-oss 12.4.2**. Plugin: `grafana-opensearch-datasource` (bundled at startup).

---

## Dashboards

| Dashboard | UID | Data Source | Purpose |
|-----------|-----|-------------|---------|
| Cowrie — Attack Overview | `cowrie-overview` | OpenSearch `wazuh-alerts-4.x-*` | Sessions over time, top IPs, countries, commands |
| Credential Attempts | `credential-attempts` | OpenSearch | Top usernames, passwords, and pairs from honeypot |
| Recon - Attack Surface | *(live on argus)* | OpenSearch `recon-surface-*` | Fuji recon scan output against home public IP and ningi.dev |
| Unified Host View | `unified-host-view` | OpenSearch | Per-host event counts, high-severity alerts, honeytoken triggers |

---

## Data Sources

| Name | UID | URL | Index |
|------|-----|-----|-------|
| OpenSearch (Wazuh alerts) | `opensearch` | `https://host.docker.internal:9200` | `wazuh-alerts-4.x-*` |
| OpenSearch (Recon) | *(live)* | `https://host.docker.internal:9200` | `recon-surface-*` |

Credentials for OpenSearch come from `~/infrastructure/grafana.env` — same `OPENSEARCH_USER` and `OPENSEARCH_PASS` as in `~/.config/argus/secrets.env`.

---

## How It Works

```
Wazuh indexer (OpenSearch :9200 localhost)
        │
        ▼
Grafana (grafana-opensearch-datasource plugin)
        │
        ▼
Dashboards (provisioned from ~/infrastructure/grafana/)
        │
        ▼
Viewable at http://100.105.93.66:3000 (Tailscale)
```

Fuji recon output is indexed separately into `recon-surface-*` by `~/bin/recon-sync-opensearch.py`, which runs every 15 minutes via cron and pulls scan artifacts from fuji over Tailscale SSH.

---

## Key Concepts for Learning

### What is a time-series visualisation?
Grafana is built around data that has timestamps — it displays how metrics change over time. A "sessions over time" panel shows attack waves; a spike at 3am is immediately visible as a bar or line, not buried in a log file.

### What is dashboard provisioning?
Rather than clicking through the Grafana UI to create datasources and dashboards, provisioning defines them in YAML/JSON files that Grafana reads at startup. This means they can be version-controlled and recreated from scratch automatically.

### What is the OpenSearch datasource plugin?
Grafana does not natively speak OpenSearch's query language. The `grafana-opensearch-datasource` plugin translates Grafana panel queries into OpenSearch DSL (domain-specific language), runs them against the index, and returns data for display.

### What is PromQL? (Not used here, but common in other stacks)
Prometheus Query Language — used when Grafana is backed by Prometheus instead of OpenSearch. If you later add node-exporter + Prometheus for host metrics, you'd write PromQL to query things like CPU usage over time.

---

## Access

| Resource | URL |
|----------|-----|
| Grafana | `http://100.105.93.66:3000` |

---

## Restart Commands

```bash
cd ~/infrastructure && docker compose up -d grafana
```

---

## Tags
#homelab #stack #monitoring #grafana #opensearch #wazuh #argus
