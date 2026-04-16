# Runbook — New Host SSH Hardening

> Standard SSH hardening checklist applied to every new host in NINGI//LAB. Covers port change, auth hardening, and Tailscale-only access for remote nodes.

---

## Why Harden SSH?

SSH port 22 is one of the most scanned ports on the internet. Within seconds of a new VPS getting a public IP, automated scanners are hitting port 22 with credential lists. Hardening SSH is not about perfect security — it's about removing low-effort attack surface so that only deliberate, targeted attacks can succeed.

The fuji honeypot exists partly to demonstrate what this noise looks like in practice — thousands of login attempts per day are completely normal on an unhardened port 22.

---

## Step 1 — Change the SSH Port

Edit `/etc/ssh/sshd_config`:

```
Port 2233
```

> On margo-1 the port is 2244. Standardise with whatever the host README documents.

---

## Step 2 — Disable Root Login and Password Auth

In `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

Ensure your public key is in `~/.ssh/authorized_keys` **before** applying this — you will lock yourself out otherwise.

---

## Step 3 — Restart SSH

```bash
sudo systemctl restart sshd

# Verify it's listening on the new port
sudo ss -ltnp | grep sshd
```

> **Do not close your existing session yet.** Open a second SSH connection on the new port to verify it works before closing the current one.

---

## Step 4 — Configure UFW

For a remote node (fuji, margo-1) that should only be SSH-accessible via Tailscale:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH only on tailscale0 interface
sudo ufw allow in on tailscale0 to any port 2233 proto tcp

# Allow Tailscale itself
sudo ufw allow 41641/udp

sudo ufw enable
sudo ufw status verbose
```

For argus (LAN + Tailscale SSH access):

```bash
sudo ufw allow in on eno1 to any port 2233 proto tcp
sudo ufw allow in on tailscale0 to any port 2233 proto tcp
```

---

## Step 5 — Install and Configure fail2ban (Remote Nodes)

fail2ban watches auth logs and bans IPs that fail too many times. On fuji and margo-1:

```bash
sudo apt install fail2ban -y
```

Create `/etc/fail2ban/jail.local`:

```ini
[sshd]
enabled = true
port = 2233
maxretry = 3
bantime = 3600
findtime = 600
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status sshd
```

> **Gotcha on fuji:** fail2ban can accidentally ban Tailscale client IPs if they're coming through on the same interface. Monitor carefully after enabling.

---

## Step 6 — Verify from Outside

SSH from a different machine to confirm:
- Old port 22 is closed (or shows Cowrie on fuji)
- New port works with key auth only
- Password auth is rejected

```bash
# Should fail / time out
ssh user@<host> -p 22

# Should succeed with key
ssh user@<host> -p 2233
```

---

## Step 7 — Update Documentation

- Update the host's `README.md` with the SSH port
- Update `Homelab/ningi-homelab-ai-md/CLAUDE.md` hosts table
- Update `Homelab/Hosts/<hostname>.md`

---

## Current SSH Ports by Host

| Host | SSH Port | Accessible From |
|------|----------|-----------------|
| argus | 2233 | LAN + Tailscale |
| fuji | 2233 | Tailscale only (UFW enforced) |
| margo-1 | 2244 | Tailscale only |

---

## Tags
#homelab #runbook #ssh #hardening #security #ufw #fail2ban
