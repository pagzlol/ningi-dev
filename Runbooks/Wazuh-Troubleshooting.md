# Runbook — Wazuh Troubleshooting

> Diagnosing and fixing common Wazuh problems. Covers agent disconnection, custom rules not firing, dashboard issues, and the known auditd chaining gotcha.

---

## Quick Wazuh Health Check

```bash
# On argus
docker ps | grep wazuh
curl -k https://100.105.93.66:8443          # Dashboard reachable?
curl -s http://localhost:9200/_cluster/health # OpenSearch healthy?
sudo systemctl status wazuh-realtime --no-pager
```

---

## Problem: Remote Agent Stopped Reporting

Symptoms: fuji or margo-1 agent shows as disconnected in the dashboard. No events arriving from that host.

### Step 1 — Check manager is up

```bash
docker ps | grep wazuh.manager
sudo ss -ltnp | grep -E '1514|1515|8443'
docker logs wazuh.manager --tail 100
```

### Step 2 — Check connectivity from the agent host

SSH to the affected host and verify Tailscale connectivity to argus:

```bash
tailscale status
nc -zv 100.105.93.66 1514   # Should succeed
nc -zv 100.105.93.66 1515   # Should succeed
```

### Step 3 — Check agent status on argus

```bash
cd ~/wazuh-docker/single-node
docker compose exec -T wazuh.manager /var/ossec/bin/agent_control -l
```

Look for the agent — is it listed as Active, Disconnected, or Never Connected?

### Step 4 — Handle stale agent registration

If you see `Duplicate name` in the manager logs, there's a stale registration blocking re-enrollment:

```bash
# List all agents including disconnected
docker compose exec -T wazuh.manager /var/ossec/bin/manage_agents -l

# Remove stale agent (replace N with agent ID)
docker compose exec -T wazuh.manager /var/ossec/bin/manage_agents -r N
```

Then on the agent host, re-enroll:

```bash
sudo /var/ossec/bin/agent-auth -m 100.105.93.66 -p 1515
sudo systemctl restart wazuh-agent
```

**Known patterns:**
- Stale Windows agent `003` `MacbookWin11` was replaced by active agent `006` `macbookwin11`
- Stale `fuji` agent `004` was replaced — fuji re-enrolled as agent `007`

---

## Problem: Custom Rules Not Firing

Symptoms: events arrive in OpenSearch (visible in dashboard raw view) but custom rule IDs (100200+) never appear in alerts.

### Check 1 — Rule file syntax

```bash
docker logs wazuh.manager --tail 200 | grep -iE "error|warn|rule"
```

A syntax error in `local_rules.xml` can prevent the **entire file** from loading silently.

### Check 2 — Rule file mount path

```bash
grep -n "rule_dir\|ruleset" ~/wazuh-docker/single-node/config/wazuh_cluster/wazuh_manager.conf
```

`local_auditd_rules.xml` must be in the **ruleset mount path** — not the same path as `local_rules.xml`. Mounting it in the wrong location means the manager never reads it.

### Check 3 — auditd rule chaining gotcha

**Symptom:** auditd custom child rules (100500–100506) never fire even when parent events arrive.

**Root cause:** Wazuh built-in terminal rules 80784/80789/80791 consume auditd events before custom child rules using `<if_sid>` can match.

**Fix:** Change child rules from `<if_sid>` to `<if_group>audit_command</if_group>`. This matches the group label rather than a specific rule ID, so it works regardless of which built-in rule consumed the event first.

```xml
<!-- Wrong — blocked by built-in terminal rules -->
<rule id="100500" level="10">
  <if_sid>80784</if_sid>
  ...
</rule>

<!-- Correct -->
<rule id="100500" level="10">
  <if_group>audit_command</if_group>
  ...
</rule>
```

### Check 4 — Cowrie syslog field extraction

Cowrie rules 100710–100713 are syslog-parsed. The Wazuh decoder does **not** extract `data.srcip` for these events — source IPs appear in `full_log` text only. If a rule queries `data.srcip` for Cowrie events, it will never match.

---

## Problem: Dashboard Not Loading

```bash
docker logs wazuh.dashboard --tail 100
curl -k https://100.105.93.66:8443
```

If dashboard is up but shows "OpenSearch not reachable":

```bash
curl -s http://localhost:9200/_cluster/health
docker logs wazuh.indexer --tail 100
```

The dashboard config is bind-mounted from `~/wazuh-docker/single-node/config/wazuh_dashboard/wazuh.yml` — this is the source of truth for connection settings.

---

## Problem: wazuh-realtime.service Errors

```bash
sudo systemctl status wazuh-realtime --no-pager
journalctl -u wazuh-realtime -n 100 --no-pager
```

Common causes:
- OpenSearch is down (Wazuh indexer container stopped)
- `secrets.env` credentials are wrong or file permissions changed
- OpenSearch index pattern changed (check `wazuh-alerts-4.x-*`)

Verify OpenSearch is reachable and credentials work:

```bash
source /home/t/.config/argus/secrets.env
curl -s -u "${OPENSEARCH_USER}:${OPENSEARCH_PASS}" http://localhost:9200/_cat/indices | grep wazuh-alerts
```

---

## Useful Manager Commands

```bash
# All run inside the wazuh.manager container
cd ~/wazuh-docker/single-node

# List agents
docker compose exec -T wazuh.manager /var/ossec/bin/agent_control -l

# View recent manager log
docker compose exec -T wazuh.manager tail -n 200 /var/ossec/logs/ossec.log

# Reload rules without restart
docker compose exec -T wazuh.manager /var/ossec/bin/ossec-control reload
```

---

## Tags
#homelab #runbook #wazuh #troubleshooting #argus #siem
