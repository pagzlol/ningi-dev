# Runbook — Adding a Wazuh Agent

> Step-by-step guide for enrolling a new host as a Wazuh agent reporting to the argus manager. Covers Linux hosts (Ubuntu/Debian). Run manager-side steps on argus and agent-side steps on the new host.

---

## Prerequisites

- New host must be reachable from argus over Tailscale
- Wazuh manager must be running on argus (`docker ps | grep wazuh.manager`)
- SSH access to the new host

---

## Concepts

### What is agent enrollment?
Before a Wazuh agent can send events to the manager, it must be registered. Enrollment involves:
1. The agent contacts the manager on port **1515** (the enrollment port) over TLS
2. The manager verifies the agent (by password or cert) and issues it a unique **agent ID**
3. The agent then sends events to port **1514** using that ID

### Why Tailscale?
The Wazuh manager's `1514` and `1515` ports are bound to the Tailscale interface (`100.105.93.66`). This means only Tailscale-connected hosts can enroll or send events — no public exposure required.

---

## Step 1 — Install Wazuh Agent on New Host

SSH to the new host and run the Wazuh agent install. The version must match the manager (currently **4.14.4**):

```bash
# Add Wazuh repository key and source
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" \
  | sudo tee /etc/apt/sources.list.d/wazuh.list

sudo apt update
sudo apt install wazuh-agent -y
```

---

## Step 2 — Configure Agent to Point at argus Manager

Edit `/var/ossec/etc/ossec.conf` on the new host:

```xml
<ossec_config>
  <client>
    <server>
      <address>100.105.93.66</address>  <!-- argus Tailscale IP -->
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
  </client>
</ossec_config>
```

---

## Step 3 — Enroll the Agent

```bash
# On the new host — set manager address and enroll
sudo /var/ossec/bin/agent-auth -m 100.105.93.66 -p 1515
```

This contacts the argus manager, registers the agent, and writes the agent ID to `/var/ossec/etc/client.keys`.

---

## Step 4 — Start the Agent

```bash
sudo systemctl enable wazuh-agent
sudo systemctl start wazuh-agent
sudo systemctl status wazuh-agent --no-pager
```

---

## Step 5 — Verify Enrollment on argus

SSH to argus and confirm the new agent appears:

```bash
cd ~/wazuh-docker/single-node
docker compose exec -T wazuh.manager /var/ossec/bin/agent_control -l
```

The new host should appear with status `Active`.

---

## Step 6 — Update Documentation

Update the following:
- `Homelab/ningi-homelab-ai-md/CLAUDE.md` — add agent to the hosts table
- `Homelab/Hosts/<hostname>.md` — record the agent ID
- `Stacks/Wazuh-Stack.md` — update the agent inventory table

---

## Troubleshooting

### Agent shows as disconnected immediately after enrollment

Check the agent can reach the manager on port 1514:

```bash
# On the new host
nc -zv 100.105.93.66 1514
```

If that fails — Tailscale is not connected. Run `tailscale status` on the new host.

### "Duplicate name" error — manager has a stale record

```bash
# On argus — list all agents including disconnected
cd ~/wazuh-docker/single-node
docker compose exec -T wazuh.manager /var/ossec/bin/manage_agents -l

# Remove the stale agent (replace N with the ID)
docker compose exec -T wazuh.manager /var/ossec/bin/manage_agents -r N
```

Then re-run agent enrollment on the new host.

### Custom rules not firing after new agent connects

Check rule placement and syntax:

```bash
docker logs wazuh.manager --tail 200
grep -n "rule_dir" ~/wazuh-docker/single-node/config/wazuh_cluster/wazuh_manager.conf
```

---

## Current Agent Inventory

| ID | Host | Role |
|----|------|------|
| 001 | argus (local) | Primary homelab host |
| 002 | fuji | Honeypot / remote node |
| 004 | margo-1 | GCP portfolio site |

---

## Tags
#homelab #runbook #wazuh #agent #security
