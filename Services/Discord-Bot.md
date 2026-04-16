# Discord Bot & Alerting Pipeline

> The argus Discord integration provides real-time security alerts and daily digests. It replaced the earlier Telegram pipeline. Two components work together: `discord-bot.service` (the interactive bot) and `wazuh-realtime.service` (the alert relay).

---

## Components

| Component | Script | Service | Purpose |
|-----------|--------|---------|---------|
| Discord bot | `/home/t/argus_bot.py` | `discord-bot.service` | Slash commands, digest scheduling |
| Wazuh relay | `/home/t/wazuh_realtime.py` | `wazuh-realtime.service` | Real-time Wazuh alert forwarding |
| Audit triage helper | `/home/t/argus_auditd_filter.py` | (imported by bot) | Auditd alert parsing for bot commands |

Both scripts read secrets from `/home/t/.config/argus/secrets.env` (chmod 600):
- `DISCORD_WEBHOOK` — webhook URL for alert channel
- `OPENSEARCH_USER` / `OPENSEARCH_PASS` — for querying Wazuh index

---

## Wazuh Realtime Relay

`wazuh-realtime.service` polls OpenSearch every **60 seconds** and forwards alerts to Discord.

### Alert routing logic

| Condition | Action |
|-----------|--------|
| Honeytoken rule 100200 or 100201 | Immediate 🚨 alert — no batching |
| `cowrie.session.file_upload` | Immediate alert |
| File download with `authorized_keys` in `destfile` | Immediate alert |
| Commands: `redtail`, `authorized_keys`, `chattr -ia .ssh`, `rm -rf .ssh` | Immediate alert |
| Level 12+ normal events | Batched — up to 10 per message |
| Cowrie generic login/connection noise (rules 100710–100713) | Filtered — does not page Discord |

### Why filter Cowrie noise?
Fuji's port 22 receives thousands of automated login attempts per day. If every failed login attempt triggered a Discord message, the channel would be unusable. Only high-signal events (persistence, file transfers, honeytoken access) justify immediate attention. Generic noise is discarded at the relay layer.

---

## Discord Bot (argus_bot.py)

Provides slash commands for interacting with argus from Discord.

### Digest schedule
| Digest | Time |
|--------|------|
| Daily | 08:00 AEST |
| Weekly | Sunday 09:00 AEST |

The digest summarises the past 24h (or 7 days) of Wazuh alerts — counts by severity, top rules, most active source IPs, and agent health.

---

## Archived: Telegram Pipeline

The Telegram alerting pipeline (`argus_digest.py`, `argus_status.py`) has been retired and archived:

| Script | Status |
|--------|--------|
| `~/archive/argus_digest.py` | Archived — superseded by Discord bot digest |
| `~/archive/argus_status.py` | Archived — no active callers as of 2026-04-15 |

---

## Key Concepts for Learning

### What is a Discord webhook?
A URL Discord provides that lets external services post messages to a channel without OAuth or a bot token. Simpler than a full bot for one-way notifications, but has no interactive capability. The `DISCORD_WEBHOOK` secret is the URL used by the relay.

### What is a systemd service?
A way to run a long-lived process managed by the Linux init system. Systemd handles starting the process on boot, restarting it on failure, and capturing its logs to journald. Both `discord-bot.service` and `wazuh-realtime.service` are defined as systemd units so they run persistently.

### Why poll instead of push?
Wazuh writes alerts to OpenSearch. There is no native "fire a webhook when a rule matches" feature in the single-node Wazuh stack without additional tooling. Polling OpenSearch every 60 seconds is a simple, robust alternative — the worst-case alert delay is 60 seconds, which is acceptable for a homelab.

---

## Restart Commands

```bash
sudo systemctl restart wazuh-realtime
sudo systemctl restart discord-bot

# Check status
sudo systemctl status wazuh-realtime --no-pager
sudo systemctl status discord-bot --no-pager

# Follow logs
journalctl -u wazuh-realtime -f
journalctl -u discord-bot -f
```

---

## TODO

- TODO: confirm whether `discord-bot.service` is currently enabled or only historically documented as active

---

## Tags
#homelab #service #discord #alerting #wazuh #argus
