# Media Stack

> A fully automated, self-hosted media pipeline running on argus. Handles discovery, requesting, downloading, organising, and streaming of movies, TV, and music with no manual file management once configured.

---

## What Problem Does This Solve?

Instead of manually downloading files and sorting them into folders, this stack automates the entire workflow:

1. You (or others) **request** content via Seerr
2. Sonarr / Radarr / Lidarr **find** the best available release
3. Prowlarr **searches** configured indexers
4. qBittorrent or SABnzbd **downloads** it
5. The *arr app **renames and moves** it into the correct folder structure
6. Plex **picks it up automatically** and makes it available to stream

This is commonly called an "Arr stack" or "servarr stack".

---

## Stack Location

| Stack | Compose path |
|-------|-------------|
| Media (*arr + Plex + qBit + SABnzbd) | `~/arrrs/docker-compose.yml` |
| Infrastructure (NPM, Watchtower) | `~/infrastructure/docker-compose.yml` |

---

## Service Inventory

| Service | Port | Bind / Exposure | Purpose |
|---------|------|-----------------|---------|
| Plex | 32400 | Public IPv4 | Media streaming server |
| Seerr | 5055 | LAN + Tailscale | User-facing request portal |
| Sonarr | 8989 | LAN + Tailscale | TV show automation |
| Radarr | 7878 | LAN + Tailscale | Movie automation |
| Lidarr | 8686 | LAN + Tailscale | Music automation |
| Prowlarr | 9696 | LAN + Tailscale | Indexer aggregation |
| qBittorrent | 8080 (web UI), 6881 (peer) | LAN + Tailscale | Torrent client |
| SABnzbd | 8085 | LAN + Tailscale | Usenet (NZB) downloader |
| Watchtower | — | none | Auto-updates all containers |

Config root for all *arr services: `~/arrrs/`

---

## How Data Flows

```
User → Seerr (request UI)
          │
          ├─► Sonarr (TV)    ─┐
          ├─► Radarr (Movies) ─┤─► Prowlarr ─► indexers
          └─► Lidarr (Music) ─┘        │
                                        ├─► qBittorrent (torrent)
                                        └─► SABnzbd (usenet/NZB)
                                                   │
                                      Download complete
                                                   │
                              *arr renames + moves to /data/media/
                                                   │
                                    Plex scans and indexes
                                                   │
                                      Available to stream 🎬
```

---

## Storage Layout

All services share `/data` so files can be **hardlinked** instead of copied — zero extra disk usage.

```
/data/
├── downloads/
│   ├── complete/
│   │   ├── tv/         ← qBit completed TV drops here
│   │   └── movies/     ← qBit completed movies drops here
│   └── usenet/         ← SABnzbd downloads here
└── media/
    ├── tv/             ← Sonarr moves/renames files here
    ├── movies/         ← Radarr moves/renames files here
    └── music/          ← Lidarr moves/renames files here
```

> **Why hardlinks matter:** When qBittorrent finishes a download, the *arr app creates a hardlink from `/data/downloads/` to `/data/media/`. The file appears in both locations but uses disk space only once. qBit can continue seeding while Plex streams the same file.

### Underlying Storage — mergerfs

The `/data` mount is a **mergerfs** pool combining multiple drives into a single filesystem.

```
/mnt/disk1  (3.6 TB HDD) ─┐
/mnt/disk2  (916 GB HDD)  ─┤─► mergerfs ─► /data  (4.5 TB usable)
```

**Critical mergerfs setting:** `cache.files=partial` — required. Using `cache.files=off` causes `file_mmap` errors that break qBittorrent.

> **No RAID.** A disk failure means data loss on that disk. There is no redundancy at the disk level.

---

## Usenet vs Torrents

Both download methods are supported. Prowlarr manages indexers for both.

| | Torrents (qBittorrent) | Usenet (SABnzbd) |
|---|---|---|
| How it works | Peer-to-peer from other users | Download from centralised provider servers |
| Speed | Variable — depends on seeders | Fast and consistent |
| Reliability | Can stall without seeders | High if content is indexed |
| Cost | Free | Requires paid provider |
| Privacy | VPN recommended | More private by nature |

### Usenet Setup on argus

- **Provider:** Frugal Usenet (primary, priority 0) + Blocknews 300GB block (fallback, priority 40, Optional)
- **Indexer:** NZBFinder (managed via Prowlarr)
- **Client:** SABnzbd at `~/arrrs/` — downloads to `/data/downloads/usenet`

---

## Prowlarr — The Indexer Hub

Rather than configuring each indexer (torrent sites, NZB sites) separately in every *arr app, you configure them once in Prowlarr and it syncs automatically.

```
Prowlarr (configured once)
    └── Syncs to:
          ├── Sonarr
          ├── Radarr
          └── Lidarr
```

---

## Watchtower — Automatic Updates

Watchtower runs in `~/infrastructure/` and watches all containers for newer images. When found, it pulls and restarts them. Convenient for homelab; would be disabled in production where breaking changes are a concern.

---

## Key Concepts for Learning

### What is a "release"?
Media gets released with specific qualities (1080p, 4K), codecs (x264, x265/HEVC), and sources (Blu-ray, WEB-DL, HDTV). The *arr apps use **quality profiles** to define what's acceptable and pick the best available release automatically.

### What is an indexer?
A website or API maintaining a database of available content (torrents or NZBs). Prowlarr connects to multiple indexers to maximise search coverage.

### What is Seerr?
The user-facing request portal. It shows what's already in your Plex library and lets users browse (via TMDB/TVDB) and request new content. Approved requests go directly to Sonarr or Radarr.

### What is a hardlink?
A directory entry pointing to the same underlying data on disk. Unlike a copy, a hardlink costs no additional space. Both the original path and the hardlink point to the same inode (the actual file data). Delete one — the other still works.

---

## Access URLs (Tailscale)

| Service | URL |
|---------|-----|
| Plex | `http://100.105.93.66:32400` |
| Seerr | `http://100.105.93.66:5055` |
| Sonarr | `http://100.105.93.66:8989` |
| Radarr | `http://100.105.93.66:7878` |
| Lidarr | `http://100.105.93.66:8686` |
| Prowlarr | `http://100.105.93.66:9696` |
| qBittorrent | `http://100.105.93.66:8080` |
| SABnzbd | `http://100.105.93.66:8085` |

---

## Restart Commands

```bash
cd ~/arrrs && docker compose up -d
```

---

## TODOs

- TODO: verify current container names in the arrrs compose stack
- TODO: add modem forward for qBittorrent peer port 6881, then verify externally from fuji

---

## Tags
#homelab #stack #media #plex #sonarr #radarr #lidarr #prowlarr #qbittorrent #sabnzbd #usenet #argus
