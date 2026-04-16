# Plex Media Server

> Streams the media library to all clients — phones, TVs, tablets, the web. Runs in `~/arrrs/docker-compose.yml` on argus with host networking so it can handle hardware transcoding via the RTX 3060.

---

## Deployment

| Setting | Value |
|---------|-------|
| Compose stack | `~/arrrs/docker-compose.yml` |
| Config path | `~/arrrs/plex/` |
| Media root | `/data/media/` |
| Port | 32400 |
| Network mode | Host (required for hardware transcoding and client discovery) |
| Exposure | Public IPv4 — accessible without Tailscale |

Port 32400 is intentionally public — Plex clients need to reach it directly for streaming and relay discovery.

---

## Media Library Structure

Plex scans the `/data/media/` directory. Files must be correctly named and placed for Plex to identify and match them.

```
/data/media/
├── tv/        ← Sonarr manages this
├── movies/    ← Radarr manages this
└── music/     ← Lidarr manages this
```

Plex periodically scans for new files. When Sonarr or Radarr moves a completed download into `/data/media/`, Plex picks it up automatically on the next scan or via a triggered library refresh from the *arr app.

---

## Hardware Transcoding

Plex can transcode (convert) media to a format/resolution the client can handle. Software transcoding uses CPU; hardware transcoding uses the GPU — much faster and lower CPU load.

The RTX 3060 on argus is available for hardware transcoding via NVIDIA NVENC/NVDEC. Docker must have GPU access for this to work — `host` network mode and device passthrough in the Compose file handle this.

---

## Why Host Networking?

Plex uses mDNS and GDM (Plex's discovery protocol) on the local network to find clients automatically. These protocols require the container to be on the same Layer 2 network as the clients — not possible with Docker bridge networking. Host mode puts the Plex process directly on argus's network interfaces.

---

## YouTube Playlist Import

There is a helper script to import YouTube playlists into the Plex music library as albums:

```bash
bash ~/ningi-homelab-ai-md/hosts/argus/scripts/youtube-playlist-album.sh \
  "https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID"
```

What it does:
- Downloads the playlist as audio-only MP3s via `yt-dlp`
- Places files in `/data/media/music/YouTube Playlists/Album - <playlist name>/`
- Rewrites album tags so Plex sees the playlist as a single ordered album

Requirements: `yt-dlp`, `ffmpeg`, space under `/data`.

---

## Key Concepts for Learning

### What is transcoding?
Converting media from one format, codec, or resolution to another on the fly. Needed when a client (e.g. a phone on a slow connection) can't handle the original file's bitrate or codec. Direct play (no transcoding) is always preferred — it uses minimal server resources.

### What is NVENC/NVDEC?
NVIDIA's hardware video encoding/decoding engines built into the GPU. Offloads the computationally expensive codec work from the CPU. Available on RTX 3060.

### What is library scanning?
Plex reads the filenames and folder structure of your media files, then queries databases (TMDB for movies, TVDB for TV) to fetch metadata: poster art, descriptions, episode names, ratings. Correct naming is essential — Plex can't identify a file named `video1.mkv`.

---

## Access

| Resource | URL |
|----------|-----|
| Plex Web | `http://100.105.93.66:32400/web` or via `app.plex.tv` |

---

## Restart

```bash
cd ~/arrrs && docker compose up -d plex
```

---

## Tags
#homelab #service #plex #media #argus #streaming
