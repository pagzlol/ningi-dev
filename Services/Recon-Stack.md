# Recon Stack — Fuji

> External attack-surface monitoring running on fuji. Scans argus's public IP and `ningi.dev` every 6 hours from an external vantage point, then ships results to argus for Grafana visualisation and Wazuh alerting.

---

## Purpose

Fuji acts as the **external recon vantage point** for the estate. Because fuji is a separate VPS on a different network, it can see argus the same way the internet does — without any LAN or Tailscale shortcuts. This makes it the authoritative source for:

- What ports are actually open on argus from the internet
- What DNS records resolve to
- What HTTP/TLS state is visible externally
- Whether Cloudflare or NPM changes had the expected effect

---

## Stack Location

All scripts live in `~/recon/` on fuji.

| Script | Purpose | Cadence |
|--------|---------|---------|
| `monitor.sh` | Orchestrator — runs all modules, logs to `~/recon/monitor-cron.log` | Every 6h (cron) |
| `get-home-ip.sh` | Reads `~/.home_public_ip` pushed by argus; warns if stale (>15 min) | Called by monitor.sh |
| `portscan.sh` | TCP port discovery (nmap) | Every 6h |
| `webscan.sh` | Web fingerprinting (WhatWeb) | Every 6h |
| `dnsscan.sh` | DNS record snapshot and validation | Every 6h |

Run artifacts land in `~/recon/scans/runs/<YYYY-MM-DD-HHMM>/`. The symlink `~/recon/scans/latest` always points to the most recent run.

Wazuh-compatible JSON alert events are written to `~/recon/attack_surface.log` and ingested by the fuji Wazuh agent.

---

## Home IP Sync

Argus runs `~/bin/ip-reporter.sh` every 5 minutes via cron. It:
1. Detects any change in argus's public IP
2. Writes `~/.home_public_ip` on fuji at `troy@100.119.8.6` via Tailscale SSH
3. Logs changes to `~/.home_public_ip.log` on argus

The fuji recon stack reads `~/.home_public_ip` as its scan target. If that file is stale (older than 15 minutes), `get-home-ip.sh` emits a warning — the scan target IP may be outdated.

---

## Results Pipeline to argus

```
fuji recon run
     │
     ├── ~/recon/attack_surface.log  ──► fuji Wazuh agent ──► argus Wazuh manager
     │                                                              │
     │                                                         Wazuh alerts
     │
     └── ~/recon/scans/runs/<timestamp>/  ──► argus pulls over SSH every 15 min
                                                    │
                                          recon-sync-opensearch.py
                                                    │
                                          OpenSearch recon-surface-* index
                                                    │
                                          Grafana "Recon - Attack Surface" dashboard
```

---

## Confirmed Exposure (2026-04-10 recon)

A fuji recon run on 2026-04-10 confirmed:

| Target | Port | State |
|--------|------|-------|
| argus public IPv4 `1.156.214.58` | 80/tcp | Open |
| argus public IPv4 `1.156.214.58` | 443/tcp | Open |
| argus public IPv4 `1.156.214.58` | 32400/tcp | Open |
| `2001:8003:e133:7500:3::1` (IPv6) | 80/tcp | Open |
| `2001:8003:e133:7500:3::1` (IPv6) | 443/tcp | Open |

**DNS note:** the same run found `seerr.ningi.dev` resolving to stale IPv4 `1.156.234.26` — this pre-dates Cloudflare cleanup. The stale A records were removed afterward. Next fuji recon should confirm that DNS drift is fully cleared.

---

## Planned Improvements (Design Spec: 2026-04-10)

A full redesign spec exists at `Homelab/ningi-homelab-ai-md/docs/superpowers/specs/2026-04-10-fuji-recon-stack-design.md`. The key changes planned:

### Stage split by cadence

| Cadence | What runs |
|---------|-----------|
| Every 15 min | DNS validation, `httpx` HTTP probe, `curl` health checks |
| Every 6h | Full `nmap` TCP scan, WhatWeb fingerprint, CT query, Shodan snapshot |
| Every 12h/daily | TLS deep scan (`testssl.sh`), curated `nuclei` templates, IPv6 full validation |

### New tools planned
- `httpx` — structured HTTP/TLS liveness and metadata (replaces raw curl probing)
- `testssl.sh` — TLS protocol, cipher, and cert drift detection
- `nuclei` — curated vulnerability template scanning (small allowlist only)

### Alert event families planned

| Severity | Events |
|----------|--------|
| High | `new_port_exposed`, `unexpected_ipv6_exposure`, `nuclei_finding`, `tls_cert_expiring_soon` |
| Medium | `web_fingerprint_changed`, `new_subdomain_detected`, `dns_record_changed` |
| Info | `baseline_established`, `port_closed`, `scan_runtime_note` |

### Implementation order
1. Phase 2: Central target and alert helpers (`targets.sh`, `alert.sh`)
2. Phase 3: `httpx` fast probe layer (`webprobe.sh`)
3. Phase 4: TLS stage (`tlsscan.sh`)
4. Phase 5: Curated vulnerability stage (`vulnscan.sh`)
5. Phase 6: Grafana importer extension (`recon-sync-opensearch.py`)

---

## Key Concepts for Learning

### What is attack surface monitoring?
Continuously checking what your internet-facing systems expose — open ports, TLS config, DNS records, web fingerprints. The goal is to detect unintended exposure before attackers do. A port that opens unexpectedly, or a DNS record pointing to a dead IP, is the kind of drift that gets overlooked without automated monitoring.

### What is an external vantage point?
Scanning from inside your own network (LAN or Tailscale) does not tell you what the internet sees. Firewalls, NAT, and Cloudflare proxying all change what's visible. An external vantage point like fuji bypasses all of that — it sees exactly what a random internet scanner would see.

### What is certificate transparency?
Every TLS certificate issued by a public CA is logged in public Certificate Transparency (CT) logs. By querying CT logs for your domain, you can detect certificates you didn't issue — which could indicate a subdomain takeover or unauthorised issuance.

### What is Shodan InternetDB?
Shodan continuously scans the internet and maintains a database of what it finds. The InternetDB API lets you look up a public IP and see what ports, services, and CVEs Shodan has indexed. If Shodan sees something you didn't intend to expose, that's a problem.

---

## TODO

- TODO: rerun fuji recon after 2026-04-10 Cloudflare cleanup to confirm stale `seerr.ningi.dev A 1.156.234.26` is gone

---

## Tags
#homelab #service #recon #fuji #attack-surface #security-research
