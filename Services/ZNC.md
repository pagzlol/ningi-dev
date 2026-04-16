# ZNC — IRC Bouncer

> ZNC keeps IRC connections alive 24/7 on argus. It connects to IRC networks on your behalf and buffers messages while you're offline, so you never miss what was said in a channel.

---

## Configuration

| Setting | Value |
|---------|-------|
| Service | `znc.service` (systemd) |
| Config | `/etc/systemd/system/znc.service` |
| Webadmin / IRC port | 45678 (Tailscale only) |
| IRC listener | 6697 (public — verify separately before treating as internet-reachable) |
| Ident service | oidentd on 113 |

---

## What is an IRC Bouncer?

When you connect to IRC directly, your client must stay connected. If you close your laptop, you disconnect and miss all messages. A **bouncer** sits between your client and the IRC server permanently:

```
IRC Network
    │
    ▼
ZNC (argus — always on)
    │
    ▼
Your client (connects when you want, disconnects when you want)
```

When you reconnect, ZNC replays the buffered messages you missed. From the IRC network's perspective you were always online.

---

## oidentd — Ident Service

IRC servers use the **ident protocol** (port 113) to verify the username associated with a connection. oidentd answers ident requests for ZNC connections.

| Setting | Value |
|---------|-------|
| Config | `/etc/oidentd.conf` |
| Override | `/etc/systemd/system/oidentd.service.d/override.conf` |
| UFW rules | `/etc/ufw/after6.rules` |
| Exposure | LAN + Tailscale + selected IPv6 (`2001:8003:e133:7500:7::1-3`) |

> **Note on IPv6 binding:** Narrowing the oidentd bind to specific IPv6 addresses caused an IRC ident regression. The daemon keeps a wildcard IPv6 bind for IRC ident compatibility — restriction is enforced by ordered UFW IPv6 rules instead.

---

## Security Note — Prior Compromise

The **NINGI-WRITEUP-006** incident documented a ZNC compromise on the old Ubuntu host (the predecessor to argus). A weak credential allowed a cracked SHA-256 hash → webadmin access → ZNC shell module → cryptominer in `/tmp`. The current argus rebuild established hardened baselines as a result of this incident.

See [[Incidents/NINGI-WRITEUP-006]] for full details.

---

## Tags
#homelab #service #znc #irc #argus
