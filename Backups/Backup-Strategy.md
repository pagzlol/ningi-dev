# Backup Strategy

> NINGI//LAB uses two complementary backup mechanisms: a git-based config snapshot (daily, broad coverage) and a restic repository (nightly, encrypted, off-host to fuji).

---

## Why Two Systems?

No single backup method covers everything well:

| Need | Git backup | Restic |
|------|-----------|--------|
| Config drift tracking | ✅ Version history | ❌ Binary blob snapshots |
| Secret files (env, keys) | ❌ Not committed | ✅ Encrypted, included |
| Docker volumes / app state | ❌ Not included | ✅ Selectively included |
| Off-host storage | ✅ GitHub remote | ✅ fuji SFTP |
| Disaster recovery (full rebuild) | ❌ Partial | ✅ With secret restore |

Both run on argus. Secrets are **not** committed to git — restic is the recovery path for those.

---

## Git Backup — ningi-homelab-backup

### What it does
A daily backup script captures a broad snapshot of argus state and commits it to a private GitHub repo.

| Item | Detail |
|------|--------|
| Script | `/home/t/ningi-homelab-backup/scripts/backup.sh` |
| Schedule | Cron at `02:00` daily |
| Log | `/home/t/backup.log` |
| Working tree | `/home/t/ningi-homelab-backup/` |
| Remote | `git@github.com:pagzlol/ningi-homelab-backup.git` |

### What gets captured
- Selected local scripts and systemd units
- Docker Compose files from all three stacks
- Wazuh config exports
- Recon content
- Documentation
- Host-state snapshots: `ufw status`, `docker ps`, `ss -tulpn`, `crontab -l`
- Selected files and content from **fuji** and **margo-1** over SSH

### What is NOT in git
- `.env` files and `secrets.env` — staged to local tree but gitignored
- Docker volumes
- `/data` media library
- Databases

> **This backup is for config recovery and drift tracking — not full disaster recovery.** Restoring from git alone is not sufficient for secret-backed services.

---

## Restic Backup — Off-host to fuji

### What it does
Nightly encrypted backup of critical config files and secrets to a restic repository stored on fuji.

### Credential Layout on argus

| Path | Purpose |
|------|---------|
| `/home/t/.config/restic/argus/password` | Restic repo password |
| `/home/t/.config/restic/argus/env` | Restic env vars (SFTP path, password file reference) |
| `/home/t/.ssh/id_restic_fuji` | SSH key for fuji restic user |

### Repository

| Setting | Value |
|---------|-------|
| Backend | SFTP to fuji |
| Path on fuji | `/home/restic/repos/argus` |
| fuji user | `restic` (dedicated storage-only account) |
| SSH host alias | `fuji-restic` |
| First snapshot | `28facebe` (2026-04-11) |

### Backup Scope

| Path | Why |
|------|-----|
| `/home/t/.config/argus/secrets.env` | Primary secrets — required to restore any service |
| `~/arrrs/.env` + `docker-compose.yml` + `config/` | Media stack config |
| `~/infrastructure/docker-compose.yml` + `infrastructure/` | NPM + monitoring config |
| `~/wazuh-docker/.env` + `single-node/.env` + `config/` + `docker-compose.yml` | Wazuh stack config |
| `/etc/ssh/sshd_config` | SSH hardening config |
| `/etc/netplan/60-argus-static.yaml` | Network / IPv6 route config |
| `/etc/oidentd.conf` | IRC ident config |
| `/etc/systemd/system/wazuh-realtime.service` | Alert service unit |
| `/etc/systemd/system/znc.service` | ZNC service unit |

### Retention Policy

| Rule | Value |
|------|-------|
| Daily snapshots kept | 7 |
| Weekly snapshots kept | 4 |
| Monthly snapshots kept | 6 |

### Maintenance Scripts

| Script | Purpose |
|--------|---------|
| `restic-argus-backup.sh` | Nightly backup job |
| `restic-argus-maintenance.sh` | Weekly `restic check` + prune |

---

## Restic Operator Commands

All restic commands run as root on argus (backup scope includes `/etc` files). Use `HOME=/root` so SSH uses the dedicated `fuji-restic` host entry.

```bash
# List snapshots
printf 'bb254530bb\n' | sudo -S env HOME=/root bash -lc '
  source /home/t/.config/restic/argus/env
  restic snapshots
'

# List files in latest snapshot
printf 'bb254530bb\n' | sudo -S env HOME=/root bash -lc '
  source /home/t/.config/restic/argus/env
  restic ls latest
'

# Restore a single file (to safe temp location)
printf 'bb254530bb\n' | sudo -S env HOME=/root bash -lc '
  source /home/t/.config/restic/argus/env
  restic restore latest \
    --target /tmp/argus-restore \
    --include /home/t/arrrs/docker-compose.yml
'

# Check repository integrity
printf 'bb254530bb\n' | sudo -S env HOME=/root bash -lc '
  source /home/t/.config/restic/argus/env
  restic check
'

# Unlock stale locks
printf 'bb254530bb\n' | sudo -S env HOME=/root bash -lc '
  source /home/t/.config/restic/argus/env
  restic unlock
'
```

> Always restore to `/tmp/argus-restore` or another disposable target — never directly over live files during testing.

---

## Minimum Rebuild Procedure

If argus needs to be rebuilt from scratch:

1. Clone `/home/t/ningi-homelab-backup` from `git@github.com:pagzlol/ningi-homelab-backup.git`
2. Restore secrets and `.env` files from the restic repository (or separate secret source) **before** starting any Compose stacks
3. Recreate stack files and systemd units from the backup repo
4. Validate listeners, Docker containers, and Wazuh exports against the latest snapshots

> **Note:** The separate secret backup location and the restore source for persistent app state outside git still need to be documented.

---

## Workstation Role

The operator workstation holds a recovery copy of the restic password and env file. This allows inspecting or restoring snapshots even if argus is lost entirely.

---

## Key Concepts for Learning

### What is restic?
An open-source backup tool designed from the ground up for correctness, security, and efficiency. Key properties:
- **Encrypted** — data is encrypted client-side before leaving argus
- **Deduplicated** — only changed chunks are uploaded; unchanged data is not re-sent
- **Snapshots** — each backup is a point-in-time snapshot; you can restore any past state
- **Content-addressed** — data is stored by its hash, making corruption detectable

### What is SFTP?
SSH File Transfer Protocol — a secure file transfer layer built on top of SSH. Restic uses SFTP to write backup data to fuji over the existing Tailscale SSH path.

### What is deduplication?
Restic splits files into chunks and only stores unique chunks. If the same 4MB block of data appears in ten different files, it's stored once. This keeps backup sizes small even with nightly runs.

### Why not just use git for everything?
Git stores file content as-is and its history is readable by anyone with repo access. Secrets committed to git are effectively public if the repo is ever exposed. Restic encrypts everything before it leaves the source host — even if someone got the fuji repo, they'd see only encrypted blobs.

---

## TODOs

- TODO: document the separate secret backup location for full rebuild path
- TODO: document restore source for persistent app state (Docker volumes, databases)

---

## Tags
#homelab #backup #restic #git #argus #fuji #security
