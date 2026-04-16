# Vault Git Setup

> How to wire the Obsidian vault (`C:\Users\marsc\ningi.dev`) to GitHub using Obsidian Git, with the three homelab repos connected as git submodules.

---

## Vault Location

```
C:\Users\marsc\ningi.dev\
```

---

## Repo Layout

| Repo | Purpose | Vault path |
|------|---------|-----------|
| `pagzlol/ningi-vault` | The vault itself — notes, runbooks, stacks, incidents | vault root |
| `pagzlol/ningi-homelab-ai-md` | Homelab infrastructure source of truth | `Homelab/ningi-homelab-ai-md/` |
| `pagzlol/homelab-security-research` | Public incident writeups and portfolio | `Incidents/homelab-security-research/` |
| `pagzlol/ningi-homelab-backup` | ❌ stays on argus — server-side cron backup only | not in vault |

---

## Setup Sequence

> ✅ Completed 2026-04-17

```bash
git init
git remote add origin git@github.com:pagzlol/ningi-vault.git
git submodule add git@github.com:pagzlol/ningi-homelab-ai-md.git Homelab/ningi-homelab-ai-md
git submodule add git@github.com:pagzlol/homelab-security-research.git Incidents/homelab-security-research
git add .
git commit --amend -m "init: vault with submodules"
git push -u origin master --force
```

### Issues encountered during setup

- `rm -rf` does not work in PowerShell — use `Remove-Item -Recurse -Force` or Git Bash
- `.obsidian/plugins/mcp-tools/bin/mcp-server.exe` is 113MB, exceeds GitHub's 100MB limit — removed via `git rm --cached` and added to `.gitignore` before amending the commit

---

## Obsidian Git Settings

After installing the Obsidian Git plugin (see [[Tools/Obsidian-Git]]):

| Setting | Value |
|---------|-------|
| Vault backup interval | 10–30 minutes |
| Auto pull interval | 10–30 minutes |
| Pull on startup | Enabled |
| Push on commit | Enabled |
| Commit message | `vault backup: {{date}}` |
| **Submodule support** | **Enabled** ← critical |

> Submodule support means edits inside `Homelab/ningi-homelab-ai-md/` commit to the `ningi-homelab-ai-md` repo directly — not swallowed into the vault repo. The vault repo just tracks which commit of the submodule you're on.

---

## How Changes Flow

```
Claude edits vault note via MCP
          │
          ▼
Obsidian Git auto-commits + pushes (every ~10 min)
          │
          ├── vault changes → pagzlol/ningi-vault
          │
          └── ningi-homelab-ai-md changes → pagzlol/ningi-homelab-ai-md
                          │
                          ▼
              margo-1 update.sh pulls at 03:00 UTC
                          │
                          ▼
              research.ningi.dev rebuilds automatically
```

---

## Cloning the Vault on a New Machine

Because the vault uses submodules, clone with `--recurse-submodules`:

```bash
git clone --recurse-submodules git@github.com:pagzlol/ningi-vault.git ningi.dev
```

Or if already cloned without it:

```bash
git submodule update --init --recursive
```

---

## Updating Submodules

Submodules pin to a specific commit. To pull the latest from all submodule remotes:

```bash
git submodule update --remote --merge
git add .
git commit -m "chore: update submodules"
git push
```

---

## Why NOT ningi-homelab-backup in the vault?

`ningi-homelab-backup` is a server-side operational backup — runs via cron on argus at 02:00 daily, captures live host state (`docker ps`, `ss -tulpn`, etc.), pushes to GitHub. It's not documentation — it's a snapshot of runtime state. Pulling it into the vault would blur the line between "what the system is" (source of truth) and "what the system was at 2am" (backup snapshot).

---

## Tags
#homelab #tools #obsidian #git #vault #workflow
