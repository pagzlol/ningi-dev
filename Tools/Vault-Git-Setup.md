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
| `pagzlol/ningi-vault` *(new)* | The vault itself — notes, runbooks, stacks, incidents | vault root |
| `pagzlol/ningi-homelab-ai-md` | Homelab infrastructure source of truth | `Homelab/ningi-homelab-ai-md/` |
| `pagzlol/homelab-security-research` | Public incident writeups and portfolio | `Incidents/homelab-security-research/` |
| `pagzlol/ningi-homelab-backup` | ❌ stays on argus — server-side cron backup only | not in vault |

---

## Setup Sequence

Run from `C:\Users\marsc\ningi.dev` in Git Bash or PowerShell (with Git installed):

### Step 1 — Initialise the vault repo

```bash
git init
git remote add origin git@github.com:pagzlol/ningi-vault.git
```

### Step 2 — Remove the copied ningi-homelab-ai-md and replace with submodule

```bash
# Remove the static copy (content already committed to source repo)
rm -rf Homelab/ningi-homelab-ai-md

# Add as submodule
git submodule add git@github.com:pagzlol/ningi-homelab-ai-md.git Homelab/ningi-homelab-ai-md
```

### Step 3 — Add security research repo as submodule

```bash
git submodule add git@github.com:pagzlol/homelab-security-research.git Incidents/homelab-security-research
```

### Step 4 — First commit and push

```bash
git add .
git commit -m "init: vault with submodules"
git push -u origin master
```

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

`ningi-homelab-backup` is a server-side operational backup — it runs via cron on argus at 02:00 daily, captures live host state (`docker ps`, `ss -tulpn`, etc.), and pushes to GitHub. It's not documentation — it's a snapshot of runtime state. Pulling it into the vault would create confusion between "what the system is" (source of truth) and "what the system was at 2am" (backup snapshot).

---

## Tags
#homelab #tools #obsidian #git #vault #workflow
