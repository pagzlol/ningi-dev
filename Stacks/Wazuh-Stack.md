# Wazuh Stack

> The core SIEM (Security Information and Event Management) platform for NINGI//LAB. Collects, normalises, and correlates security events from all hosts, then alerts on suspicious activity via Discord in real time.

---

## What is a SIEM?

A **SIEM** does two things:

- **Collects** security-relevant logs from across your environment
- **Correlates and alerts** — applies rules to detect patterns that indicate threats

Without a SIEM, a security event on fuji just sits in a log file nobody reads. With Wazuh, that same event triggers a Discord alert within 60 seconds.

---

## Stack Location

| Component | Path |
|-----------|------|
| Docker compose | `~/wazuh-docker/single-node/docker-compose.yml` |
| Manager config | `~/wazuh-docker/single-node/config/wazuh_cluster/wazuh_manager.conf` |
| Custom rules | `~/wazuh-docker/single-node/config/wazuh_cluster/local_rules.xml` |
| Custom decoders | `~/wazuh-docker/single-node/config/wazuh_cluster/local_decoder.xml` |
| Custom auditd rules | `~/wazuh-docker/single-node/config/wazuh_cluster/local_auditd_rules.xml` |
| Dashboard config | `~/wazuh-docker/single-node/config/wazuh_dashboard/wazuh.yml` |
| Certs | `~/wazuh-docker/single-node/config/wazuh_indexer_ssl_certs/` |

---

## Architecture

NINGI//LAB runs Wazuh in **single-node** mode — manager, indexer, and dashboard all on argus.

```
┌──────────────────────────── argus ──────────────────────────────┐
│                                                                  │
│   wazuh.manager  — agent ingestion :1514/:1515, API :55000      │
│         │                                                        │
│   wazuh.indexer  — OpenSearch :9200 (localhost only)            │
│         │                                                        │
│   wazuh.dashboard — web UI :8443 (Tailscale only)              │
│                                                                  │
│   wazuh-realtime.service — polls OpenSearch → Discord           │
└──────────────────────────────────────────────────────────────────┘
          ▲                  ▲
          │                  │
   fuji agent 002      margo-1 agent 004
```

---

## Components Explained

### Wazuh Manager
The brain. It receives events from all agents, applies detection rules, generates alerts, and writes them to the indexer.

### Wazuh Indexer (OpenSearch)
Stores all alert data in a searchable time-series index. Bound to `localhost:9200` only — never exposed externally.

### Wazuh Dashboard
Web UI at `:8443` (Tailscale only). Provides alert browsing, agent management, and rule management. Connection config is bind-mounted from `config/wazuh_dashboard/wazuh.yml`.

### Wazuh Agents

| Agent ID | Host | Status |
|----------|------|--------|
| 001 | argus (local) | Active |
| 002 | fuji | Active |
| 004 | margo-1 | Active |

All agents connect to manager at `100.105.93.66` over Tailscale.

---

## Detection Pipeline

How an event becomes a Discord alert:

```
1. Event occurs on host (e.g. attacker reads honeytoken file)
2. auditd captures syscall
3. Wazuh agent reads audit log
4. Agent ships raw event to manager at 100.105.93.66:1514
5. Manager normalises event (extracts fields: user, IP, file, timestamp)
6. Manager applies rules:
     - Built-in rules (50,000+ from Wazuh)
     - Custom rules (100200-100506 range in local_rules.xml)
7. Rule matches → alert generated with level (1–15)
8. Alert written to OpenSearch (wazuh-alerts-4.x-* index)
9. wazuh-realtime.py polls OpenSearch every 60 seconds
10. Level 12+ → Discord notification sent
```

---

## Custom Rule Ranges

| Range | Purpose |
|-------|---------|
| 100200–100201 | Honeytoken access (fuji) — Level 15 |
| 100710–100713 | Cowrie syslog events (parsed from fuji syslog, no structured field extraction — `data.srcip` not available) |
| 100500–100506 | auditd / exec monitoring |

> **Cowrie note:** Rules 100710–100713 are syslog-parsed. Source IPs appear in `full_log` text only — the decoder does not extract `data.srcip` for these events.

---

## Honeytokens

Fake credentials planted on fuji. Any access = immediate high-confidence alert.

| File | Fake Credential | auditd Key | Rule | Level |
|------|----------------|------------|------|-------|
| `/root/.aws/credentials` | Fake AWS key | `honeytoken_aws` | 100200 | 15 |
| `/cowrie/.ssh/id_rsa_backup` | Fake SSH key | `honeytoken_ssh` | 100201 | 15 |

Both fire **immediate Discord 🚨 alerts** — no batching, within 60 seconds.

> Level 15 is the maximum Wazuh severity. There is no legitimate reason for these files to be accessed — any access means active attacker exploration.

---

## Alerting — wazuh-realtime.service

Custom Python service on argus (`/home/t/wazuh_realtime.py`).

- Polls OpenSearch every **60 seconds**
- Sends **Level 12+** alerts to Discord
- **Batches** normal alerts (to avoid spam)
- **Immediate individual alerts** for honeytoken rules 100200/100201
- **Filters Cowrie noise** — generic login and connection events batch rather than page immediately

### High-signal Cowrie events that DO trigger immediate Discord alerts:
- `cowrie.session.file_upload`
- `cowrie.session.file_download` where `destfile` contains `authorized_keys`
- `cowrie.command.input` containing: `redtail`, `authorized_keys`, `chattr -ia .ssh`, `rm -rf .ssh`

### Secrets location
`/home/t/.config/argus/secrets.env` (chmod 600) — contains `DISCORD_WEBHOOK`, `OPENSEARCH_USER`, `OPENSEARCH_PASS`

---

## Discord Bot — discord-bot.service

`/home/t/discord_bot.py` (replaces the retired Telegram pipeline).

- Slash commands for monitoring and control
- Daily digest at **08:00 AEST**
- Weekly digest **Sunday 09:00 AEST**
- Imports `argus_auditd_filter.py` for audit triage

---

## auditd Integration

Linux's kernel-level audit subsystem. Hooks into syscalls to log file reads/writes, process executions, user logins, and network connections. Wazuh reads auditd logs and applies rules on top.

### Known Gotcha — Rule Chaining

Custom auditd child rules using `<if_sid>` were not firing because Wazuh's built-in terminal rules (80784/80789/80791) consumed events first.

**Fix:** Switch child rules from `<if_sid>` to `<if_group>audit_command</if_group>` — matches the group instead of a specific rule ID.

### Config file placement

`local_auditd_rules.xml` must live in the **ruleset mount path** — not the normal local rules path. Syntax errors in `local_rules.xml` can silently prevent all local rules from loading.

---

## Grafana Integration

Grafana on argus (`:3000`) uses OpenSearch as a datasource to visualise Wazuh data:

- Datasource UID: `opensearch` at `https://host.docker.internal:9200`
- Indexes: `wazuh-alerts-4.x-*` and `recon-surface-*`
- Dashboards: **Cowrie — Attack Overview**, **Recon - Attack Surface**

---

## Key Concepts for Learning

### What is log normalisation?
Raw logs look different on every system. Wazuh parses them into a common schema (fields like `srcip`, `dstuser`, `action`) so rules can be written once and work across all sources.

### What is a detection rule?
A condition — if an event matches, generate an alert. Rules have severity levels, descriptions, and can chain on each other. Wazuh ships 50,000+ built-in rules covering common attack patterns.

### What is FIM (File Integrity Monitoring)?
Wazuh agents watch specific files and directories for changes. If a binary in `/usr/bin` changes, or a config file is modified unexpectedly, Wazuh alerts immediately — critical for detecting post-compromise activity.

### What does "single-node" mean?
Everything (manager, indexer, dashboard) runs on one host. Fine for a homelab but a single point of failure — a Wazuh outage on argus removes visibility across fuji and margo-1.

---

## Access

| Resource | URL |
|----------|-----|
| Wazuh Dashboard | `https://100.105.93.66:8443` |
| OpenSearch API | `http://localhost:9200` (argus local only) |
| Wazuh Manager API | `http://localhost:55000` (argus local only) |

---

## Restart Commands

```bash
cd ~/wazuh-docker/single-node && docker compose up -d
sudo systemctl restart wazuh-agent
sudo systemctl restart wazuh-realtime
```

---

## Tags
#homelab #stack #wazuh #siem #security #argus #discord #alerting #auditd #honeytokens
