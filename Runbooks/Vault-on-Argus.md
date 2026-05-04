          # Runbook — Vault Clone on Argus

> Gives Claude Code on argus direct read/write access to the vault as plain files. No Obsidian, no REST API, no laptop required. Changes push to GitHub; Obsidian Git on the laptop pulls them on next sync.

---

## How It Works

```
Claude Code (argus)
    │  reads/writes ~/ningi-vault/*.md directly
    ▼
git push → pagzlol/ningi-vault (GitHub)
                    │
                    ▼
        Obsidian Git pulls on laptop (auto, every 10 min)
```

---

## Setup

SSH to argus and run:

```bash
# Clone vault with submodules
git clone --recurse-submodules git@github.com:pagzlol/ningi-vault.git ~/ningi-vault

# Verify structure
ls ~/ningi-vault
```

Expected output:
```
Backups/  Homelab/  Incidents/  README.md  Runbooks/  Services/  Stacks/  Tools/
```

---

## CLAUDE.md for the Vault Repo

Create `~/ningi-vault/CLAUDE.md` so Claude Code knows how to use it:

```bash
cat > ~/ningi-vault/CLAUDE.md << 'EOF'
# ningi-vault — Claude Code Context

This is the NINGI//LAB Obsidian vault cloned onto argus for direct file access.

## Purpose

Read and write vault notes as plain markdown files. Changes committed and pushed
here sync back to the laptop via Obsidian Git automatically.

## Source of Truth

All homelab infrastructure facts come from:
- `Homelab/ningi-homelab-ai-md/` — git submodule, source repo: pagzlol/ningi-homelab-ai-md
- Do not treat memory summaries or other sources as authoritative

## Key Paths

| Path | Contents |
|------|---------|
| `Homelab/ningi-homelab-ai-md/CLAUDE.md` | Homelab infrastructure context |
| `Homelab/Hosts/` | Per-host summary notes |
| `Stacks/` | Stack documentation |
| `Services/` | Service documentation |
| `Runbooks/` | Operational runbooks |
| `Incidents/` | Incident writeups |
| `Backups/` | Backup strategy |

## Working Rules

- Read `Homelab/ningi-homelab-ai-md/CLAUDE.md` first for homelab infrastructure context
- Edit notes in place — do not create duplicates
- After edits: `git add . && git commit -m "docs: <description>" && git push`
- For submodule changes (anything under `Homelab/ningi-homelab-ai-md/`):
  cd into the submodule dir, commit and push there first, then come back and
  commit the parent repo submodule pointer update

## Git Remotes

- Vault: git@github.com:pagzlol/ningi-vault.git
- Homelab context submodule: git@github.com:pagzlol/ningi-homelab-ai-md.git
- Security research submodule: git@github.com:pagzlol/homelab-security-research.git
EOF
```

---

## Keeping the Clone in Sync

Pull latest vault + submodule updates:

```bash
cd ~/ningi-vault
git pull
git submodule update --remote --merge
```

Add this as a cron job to keep it current automatically:

```bash
crontab -e
# Add:
*/30 * * * * cd /home/t/ningi-vault && git pull --recurse-submodules >> /home/t/ningi-vault-sync.log 2>&1
```

---

## Using Claude Code Against the Vault

```bash
cd ~/ningi-vault
claude
```

Claude Code picks up `CLAUDE.md` automatically and knows the vault structure and working rules.

---

## Pushing Changes Back

After Claude Code edits files:

```bash
cd ~/ningi-vault
git add .
git commit -m "docs: update from argus"
git push
```

Obsidian Git on the laptop will pull this on its next auto-sync interval (within 10 min).

---

## Submodule Edits (ningi-homelab-ai-md)

If Claude Code edits files under `Homelab/ningi-homelab-ai-md/`:

```bash
# Commit the submodule first
cd ~/ningi-vault/Homelab/ningi-homelab-ai-md
git add .
git commit -m "docs: <description>"
git push

# Then update the parent vault's submodule pointer
cd ~/ningi-vault
git add Homelab/ningi-homelab-ai-md
git commit -m "chore: update ningi-homelab-ai-md submodule"
git push
```

---

## Tags
#homelab #runbook #argus #claude-code #vault #git
