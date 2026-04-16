# Obsidian Git Plugin

> Brings Git integration directly into Obsidian — auto-commit, push, pull, diff view, history view, and source control panel. Keeps the vault version-controlled without leaving Obsidian.

---

## Install

1. Open Obsidian → **Settings → Community Plugins → Browse**
2. Search for **Obsidian Git**
3. Install and enable it
4. Your vault folder must already be a git repo (or `git init` it first)

---

## Prerequisites

Git must be installed and accessible on your PATH. Verify:

```powershell
git --version
```

The vault directory needs to be a git repo with a configured remote:

```bash
cd C:\path\to\your\vault
git init
git remote add origin git@github.com:pagzlol/your-vault-repo.git
git add .
git commit -m "init"
git push -u origin master
```

For a private repo, use SSH key auth or a GitHub Personal Access Token (PAT) for HTTPS.

---

## Key Features

| Feature | What it does |
|---------|-------------|
| **Auto commit + push** | Commits and pushes on a configurable schedule (e.g. every 10 min) |
| **Auto pull on startup** | Pulls latest changes when Obsidian opens |
| **Source Control View** | Stage/unstage files, write commit messages, push/pull — all in a sidebar panel |
| **History View** | Browse commit log, see what changed in each commit |
| **Diff View** | Line-by-line diff of a file vs its last committed state |
| **Editor signs** | Inline indicators for added/modified/deleted lines (like VS Code's gutter) |

---

## Recommended Settings

Open **Settings → Obsidian Git**:

| Setting | Recommended value | Why |
|---------|------------------|-----|
| Vault backup interval | 10–30 minutes | Auto-commit on a schedule |
| Auto pull interval | 10–30 minutes | Stay current if editing from multiple devices |
| Commit message | `vault backup: {{date}}` | Timestamped commits |
| Pull on startup | Enabled | Ensures you start with latest state |
| Push on commit | Enabled | Commit and push in one action |
| Disable push | Off | Keep pushing enabled |

---

## Commands (Command Palette)

Open with `Ctrl+P` then type:

| Command | Action |
|---------|--------|
| `Obsidian Git: Create backup` | Commit all changes and push |
| `Obsidian Git: Pull` | Pull latest from remote |
| `Obsidian Git: Open source control view` | Open the staging/commit sidebar |
| `Obsidian Git: Open history view` | Browse commit history |
| `Obsidian Git: Open diff view` | Diff current file |
| `Obsidian Git: Stage current file` | Stage just this file |
| `Obsidian Git: Commit staged` | Commit what's staged |

---

## Relevance for NINGI//LAB

With this plugin, the Obsidian vault becomes a **live synced mirror of the homelab docs**. Workflow:

1. Claude updates vault notes via MCP tools
2. Obsidian Git auto-commits and pushes to GitHub on schedule
3. margo-1 `update.sh` pulls from `pagzlol/ningi-homelab-ai-md` at 03:00 UTC daily
4. `research.ningi.dev` rebuilds with updated content automatically

This closes the loop — vault edits flow through to the public portfolio site without manual steps.

---

## Linking to `ningi-homelab-ai-md`

The vault currently has the repo contents copied into `Homelab/ningi-homelab-ai-md/`. To keep this in sync via Git submodule (optional, desktop only):

```bash
# Inside the vault root
git submodule add git@github.com:pagzlol/ningi-homelab-ai-md.git Homelab/ningi-homelab-ai-md
git commit -m "add ningi-homelab-ai-md as submodule"
```

Then enable **Submodule support** in Obsidian Git settings. This means edits to that subfolder are committed to the source repo, not the vault repo — keeping them properly separated.

---

## Resources

- GitHub: https://github.com/Vinzent03/obsidian-git
- Full docs: https://publish.obsidian.md/git-doc

---

## Tags
#homelab #tools #obsidian #git #workflow
