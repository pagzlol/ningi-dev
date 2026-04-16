# ~/bin Scripts — Argus

> Detailed breakdown of all scripts in `/home/t/bin` on argus. Covers what each script does, how it runs (cron vs interactive), dependencies, and a line-by-line explanation of the logic.

---

## Script Inventory

| Script | Type | What it does |
|--------|------|-------------|
| `ip-reporter.sh` | Cron (every 5 min) | Detects public IP changes, pushes current IP to fuji |
| `cloudflare-ddns.sh` | Cron | Updates Cloudflare DNS A records when public IP changes |
| `recon-sync-opensearch.py` | Cron (every 15 min) | SSHes to fuji, pulls recon run artifacts, indexes into OpenSearch |
| `argus-dashboard` | Interactive | Opens a tmux monitoring dashboard (btop + docker stats + disk/mem) |
| `kamado_mqtt.py` | Interactive | Controls Kamado Joe grill via AWS IoT MQTT |
| `youtube-playlist-album.sh` | Interactive | Downloads a YouTube playlist as a Plex-ready album |

---

## ip-reporter.sh

**Runs:** cron every 5 minutes
**Purpose:** Keeps fuji's recon stack pointed at the correct home public IP, even when it changes (dynamic residential ISP).

### The problem it solves

Fuji runs external recon scans against argus's public IP. But home ISPs hand out dynamic IPs — the address can change at any time. If fuji doesn't know the current IP, its scans target the wrong host. This script is the bridge.

### How it works

```
argus cron (every 5 min)
    │
    ├── 1. Query public IP from multiple sources
    │       tries: api.ipify.org → ifconfig.me → ipecho.net/plain
    │       stops at the first valid IPv4 response
    │
    ├── 2. Compare to last known IP (stored in ~/.home_public_ip)
    │
    ├── 3a. IP unchanged → rewrite file (refresh timestamp), push to fuji silently
    │
    └── 3b. IP changed → log the change, write new IP, push to fuji via SSH
```

### Code breakdown

```bash
IP_FILE="$HOME/.home_public_ip"   # local cache of current IP
LOG="$HOME/.home_public_ip.log"   # change log
FUJI_TARGET="t@100.119.8.6"       # fuji Tailscale address
FUJI_PORT=2233                     # fuji real SSH port
```

**IP detection loop** — tries three sources in order, stops at the first valid IPv4:
```bash
for url in "https://api.ipify.org" "https://ifconfig.me" "https://ipecho.net/plain"; do
    CURRENT=$(curl -sf --max-time 5 "$url" ...)
    if [[ "$CURRENT" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        break   # valid IP found — stop trying
    fi
done
```
The regex `^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$` validates it's an IPv4 address, not an error page.

**Push function** — writes the IP to fuji's `~/.home_public_ip` file over SSH:
```bash
printf '%s\n' "$ip" | ssh -q -p 2233 ... "cat > ~/.home_public_ip"
```
Uses `cat >` instead of `scp` or `sftp` because fuji doesn't have sftp available. Pipes the IP string directly into the remote file via stdin. `-o BatchMode=yes` prevents it hanging waiting for a password prompt if SSH auth fails.

**Why refresh even when unchanged?** Fuji's `get-home-ip.sh` checks the file's age and warns if it's stale (>15 min). Refreshing every 5 minutes keeps the staleness check from false-alarming even when the IP hasn't actually changed.

### Dependencies
- `curl` — IP lookup
- `ssh` — push to fuji (uses existing Tailscale SSH key)

---

## cloudflare-ddns.sh

**Runs:** cron (interval not shown — likely every 5–15 min)
**Purpose:** Dynamic DNS — keeps Cloudflare A records pointed at the current home public IP automatically.

### The problem it solves

When the home IP changes, any Cloudflare DNS records pointing to it become stale — `ningi.dev` and its subdomains stop resolving correctly. This script detects the IP change and updates the records via Cloudflare's API.

### How it works

```
cron
  │
  ├── 1. Load config from ~/.config/argus/cloudflare-ddns.env
  │       CF_API_TOKEN, CF_ZONE_ID, CF_RECORDS (comma-separated list)
  │
  ├── 2. Get current public IPv4 (same 3-source approach as ip-reporter.sh)
  │
  ├── 3. Compare to cached IP (~/.cloudflare_ddns_ip)
  │       No change → update cache timestamp, log, exit
  │
  └── 4. IP changed → for each record in CF_RECORDS:
            ├── Look up record in Cloudflare API
            ├── If exists → UPDATE with new IP
            └── If missing → CREATE new A record
```

### Code breakdown

**Config format** — `CF_RECORDS` is a comma-separated list of `name:proxied` pairs:
```bash
CF_RECORDS="ningi.dev:true,sub.ningi.dev:false"
# name = DNS record name
# proxied = whether to route through Cloudflare's CDN/proxy (true/false)
```

**Cloudflare API wrapper:**
```bash
cf_request() {
    local method="$1"   # GET, POST, PUT
    local path="$2"     # e.g. /zones/$CF_ZONE_ID/dns_records
    local data="${3:-}"  # optional JSON body
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4$path" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "$data"
}
```
All Cloudflare API calls go through this one function. The Bearer token is scoped to DNS edit permissions only.

**Record lookup** — uses `python3 -c` inline to parse the JSON response:
```bash
lookup_record() {
    cf_request GET "/zones/$CF_ZONE_ID/dns_records?type=A&name=$name" \
        | python3 -c '
items = doc.get("result", [])
item = items[0]
print("\t".join([item["id"], item["content"], str(item["proxied"])]))
'
}
```
Returns three tab-separated fields: `record_id`, `current_ip`, `proxied`. If empty → record doesn't exist yet.

**Create vs update logic:**
```bash
if [ -z "$lookup" ]; then
    create_record "$name" "$CURRENT_IP" "$proxied"   # new record
else
    IFS=$'\t' read -r record_id record_ip record_proxied <<< "$lookup"
    if [ "$record_ip" = "$CURRENT_IP" ] && [ "$record_proxied" = "$proxied" ]; then
        log "No change needed"   # already correct
    else
        update_record "$record_id" ...   # update existing
    fi
fi
```
Only makes API calls when something actually needs to change — avoids hammering Cloudflare unnecessarily.

### Config file
`~/.config/argus/cloudflare-ddns.env` — not committed to git. Contains:
```
CF_API_TOKEN=...
CF_ZONE_ID=...
CF_RECORDS=ningi.dev:true,other.ningi.dev:false
CF_DEFAULT_PROXIED=false
```

### Dependencies
- `curl` — IP lookup + Cloudflare API
- `python3` — JSON parsing (inline one-liners)

---

## recon-sync-opensearch.py

**Runs:** cron every 15 minutes
**Purpose:** Bridge between fuji's recon scans and argus's Grafana dashboards. SSHes to fuji, reads all recon run artifacts, normalises them into structured documents, and bulk-indexes them into OpenSearch.

### The problem it solves

Fuji runs scans and writes results to `~/recon/scans/runs/<timestamp>/`. Grafana on argus needs that data in OpenSearch to display it. This script is the ETL (Extract, Transform, Load) pipeline between them.

### How it works

```
cron (every 15 min) on argus
  │
  ├── SSH to fuji → list all run directories
  │
  ├── For each run directory:
  │     ├── SSH cat: monitor.log, open_ports.txt, dns_records.txt,
  │     │            subdomains.txt, shodan.json, whatweb_*.txt,
  │     │            targets.json, httpx.jsonl, tlsscan.jsonl, summary.json
  │     │
  │     └── Build structured documents (one per port, alert, DNS record, etc.)
  │
  ├── Ensure OpenSearch index template exists (recon-surface-*)
  │
  └── Bulk index all documents into OpenSearch
        index name: recon-surface-YYYY.MM
```

### Document types produced

Each run produces multiple document types — one per meaningful data point:

| `doc_type` | Source file | What it captures |
|------------|-------------|-----------------|
| `monitor_alert` | `monitor.log` | ALERT lines — severity, event type, detail |
| `open_port` | `open_ports.txt` | Each open port: number, protocol, service |
| `dns_record` | `dns_records.txt` | Each DNS record with inferred type (A/AAAA/MX/TXT) |
| `subdomain` | `subdomains.txt` | Each discovered subdomain |
| `target_definition` | `targets.json` | Each scan target with allowed scan methods |
| `http_probe` | `httpx.jsonl` | HTTP endpoint: status, title, server, tech stack |
| `tls_probe` | `tlsscan.jsonl` | TLS cert: subject, issuer, expiry, cipher |
| `shodan_port` | `shodan.json` | Port Shodan has indexed |
| `shodan_vuln` | `shodan.json` | CVE Shodan has flagged |
| `web_fingerprint` | `whatweb_*.txt` | WhatWeb tech fingerprint per target |
| `run_summary` | derived | Counts of everything — one per run |

### Code breakdown

**SSH helper** — all file reads go over SSH:
```python
def ssh(command: str) -> str:
    proc = subprocess.run(
        ["ssh", "-p", FUJI_PORT, FUJI_TARGET, command],
        check=True, capture_output=True, text=True,
    )
    return proc.stdout

def remote_file(run_id: str, filename: str) -> str:
    remote_path = f"{REMOTE_RUNS_DIR}/{run_id}/{filename}"
    return ssh(f"cat {shlex.quote(remote_path)} 2>/dev/null || true")
    #                                            ↑ silently empty if file doesn't exist
```
`shlex.quote()` safely escapes the path to prevent shell injection. `|| true` means missing files return empty string rather than failing.

**Document ID scheme** — each document gets a deterministic ID:
```python
f"{run_id}:port:{port}:{proto}"       # e.g. "2026-04-10-1200:port:443:tcp"
f"{run_id}:alert:{line_number}"       # e.g. "2026-04-10-1200:alert:42"
f"{run_id}:summary"                   # one per run
```
Deterministic IDs mean re-indexing the same run overwrites existing docs (idempotent). Safe to run every 15 minutes.

**DNS type inference** — guesses record type from value format since the raw file doesn't label them:
```python
def infer_dns_type(value: str) -> str:
    if IPV4_RE.match(value):  return "A"
    if ":" in value:          return "AAAA"   # IPv6 has colons
    if MX_RE.match(value):    return "MX"     # starts with priority number
    if value.endswith("."):   return "NS"     # NS records end with dot
    if value.startswith('"'): return "TXT"    # TXT records are quoted
    return "unknown"
```

**Bulk indexing** — sends all documents in one HTTP request using OpenSearch's `_bulk` API:
```python
for doc_id, doc in docs:
    lines.append(json.dumps({"index": {"_index": index_name, "_id": doc_id}}))
    lines.append(json.dumps(doc))

payload = ("\n".join(lines) + "\n").encode()
opensearch_request("POST", "/_bulk?refresh=wait_for", ...)
```
NDJSON format: alternating action line + document line. `refresh=wait_for` ensures documents are searchable immediately after the request completes.

### Config
Reads credentials from `~/infrastructure/grafana.env` — same `OPENSEARCH_USER` and `OPENSEARCH_PASS` used by Grafana itself.

### Dependencies
- `ssh` access to fuji (Tailscale)
- OpenSearch running on `localhost:9200` (Wazuh indexer)
- `~/infrastructure/grafana.env` — credentials

---

## argus-dashboard

**Runs:** interactive — run manually when you want a system overview
**Purpose:** One command to open a full system monitoring view in tmux.

### What it opens

```
┌─────────────────────────────────────────┐
│  btop (top pane — 50% height)           │
│  CPU, memory, processes, network        │
├────────────────────┬────────────────────┤
│  docker stats      │  watch df/free     │
│  (bottom-left)     │  (bottom-right)    │
└────────────────────┴────────────────────┘
```

### How it works

```bash
if tmux has-session -t "argus" 2>/dev/null; then
    exec tmux attach -t "argus"   # already running — just attach
fi
```
First checks if the session exists. If you run `argus-dashboard` a second time, it just reattaches to the existing session rather than creating a duplicate.

```bash
tmux new-session -d -s "argus" -n dashboard 'btop'
tmux split-window -v -t "argus":1 'docker stats'
tmux split-window -h -t "argus":1.2 'watch -n 2 "df -h / && echo && free -h"'
tmux select-layout -t "argus":1 main-horizontal
tmux set-window-option -t "argus":1 main-pane-height 50%
```
- `new-session -d` — create session in background (`-d` = detached)
- `split-window -v` — split the pane vertically (top/bottom)
- `split-window -h` — split the bottom pane horizontally (left/right)
- `main-horizontal` layout — one large pane on top, smaller panes below
- `main-pane-height 50%` — top pane gets half the screen

### Usage
```bash
argus-dashboard         # open or reattach
Ctrl+B, d               # detach (leave running in background)
Ctrl+B, arrow keys      # switch between panes
```

### Dependencies
- `tmux`
- `btop`
- `docker`
- `watch` (standard Linux util)

---

## kamado_mqtt.py

**Runs:** interactive — run manually to check or control the grill
**Purpose:** Control a Kamado Joe grill over AWS IoT MQTT. Reads temperature, polls live, or sets a target temperature.

### Usage
```bash
python3 kamado_mqtt.py state        # single temperature check
python3 kamado_mqtt.py poll         # live monitor (updates every 10s)
python3 kamado_mqtt.py set 180      # set target temperature to 180°C
```

### Architecture — why is a grill using AWS IoT?

Kamado Joe's Connect app communicates with the grill controller via AWS IoT Core — a managed MQTT broker. The grill is an IoT "Thing" with a device shadow (a JSON state document in the cloud). The app reads and writes the shadow; the grill controller syncs with it.

```
Kamado Joe grill controller
        │  (WiFi → AWS IoT MQTT)
        ↓
AWS IoT Core (MQTT broker)
  └── Device Shadow: {"state": {"reported": {...}, "desired": {...}}}
        │
        ↑  (this script reads/writes the shadow)
kamado_mqtt.py
```

### Auth flow — three layers deep

```
1. CAS login (Kamado Joe's OAuth server)
       POST /api/v1/auth/login with Basic auth (app client credentials)
       → CAS bearer token

2. Cognito USER_PASSWORD_AUTH (service account)
       Uses a shared service account embedded in the app
       → Cognito ID token

3. AWS Cognito Identity Pool
       Exchange ID token for temporary AWS credentials (AccessKey/SecretKey/SessionToken)
       → AWS creds valid for ~1 hour

These creds are used to:
  - Call AWS IoT APIs (create temporary cert)
  - Connect to AWS IoT MQTT broker via TLS mutual auth
```

### Session caching
```python
def load_cached_session():
    if SESSION_FILE.exists():
        s = json.loads(SESSION_FILE.read_text())
        if s.get("expiry", 0) > time.time() + 300:  # valid for >5 more min
            return s
    return None
```
Auth is expensive (3 API calls). Credentials are cached in `~/.config/kamado/session.json` and reused until 5 minutes before expiry. Fresh login only happens when the cache is stale.

### How `set <temp>` works

```python
def set_temperature(target_temp_c):
    # 1. Get auth session
    bearer, aws_creds = get_session()

    # 2. Create a fresh IoT certificate (required for MQTT mutual TLS)
    iot = boto3.client("iot", ...)
    r = iot.create_keys_and_certificate(setAsActive=True)
    # cert + private key written to temp files

    # 3. Register the cert with the grill's IoT policy
    requests.post(POLICY_URL, json={"aws_iot_certificate_arn": cert_arn, ...})

    # 4. Connect to MQTT broker with cert-based auth
    client = mqtt.Client(...)
    client.tls_set(certfile=..., keyfile=...)
    client.connect(MQTT_HOST, port=8883)

    # 5. Publish to the device shadow update topic
    topic = f"$aws/things/{THING_NAME}/shadow/update"
    payload = {"state": {"desired": {"heat": {"t2": {"trgt": target_temp_c}}}}}
    client.publish(topic, json.dumps(payload), qos=1)

    # 6. Verify by reading current state
    get_grill_state(bearer)
```

The `desired` state tells the grill controller what you want. The controller reads it and updates `reported` when it's achieved. QoS 1 (`at least once`) means the broker confirms receipt.

### Credentials setup
```
~/.config/kamado/auth.json
{
  "username": "your-kamado-account@email.com",
  "password": "your-password",
  "cognito_refresh_token": "..."   # obtained via mitmproxy from app traffic
}
```

### Dependencies
- `boto3` — AWS SDK (IoT, Cognito)
- `paho-mqtt` — MQTT client
- `pycognito` — Cognito auth helper
- `requests` — HTTP calls to CAS/policy endpoints

---

## youtube-playlist-album.sh

**Runs:** interactive — run manually to import a playlist
**Purpose:** Download a YouTube playlist as audio and import it into the Plex music library as a single coherent album, with correct track ordering and metadata.

### Usage
```bash
youtube-playlist-album.sh "https://www.youtube.com/playlist?list=PLxxx"
# Output: /data/media/music/YouTube Playlists/Album - <playlist name>/
```

### The problem it solves

`yt-dlp` by default downloads playlists with inconsistent filenames and per-track metadata. Plex needs the album field to be identical across all tracks to group them. This script downloads, then rewrites the tags on every track so Plex sees the playlist as one album.

### How it works

```
1. Get playlist metadata (title, uploader) without downloading
       yt-dlp --flat-playlist --print '%(playlist_title)s'

2. Sanitize the name (remove special chars that break filenames/paths)

3. Create destination: /data/media/music/YouTube Playlists/Album - <title>/

4. Download all tracks:
       yt-dlp --extract-audio --audio-format mp3 --audio-quality 0
       filename pattern: 001 - Track Title.mp3, 002 - ..., etc.

5. For each downloaded MP3 — rewrite tags with ffmpeg:
       album = "Album - <playlist title>"
       album_artist = playlist uploader
       track = N/total
       disc = 1/1
       (keeps original title, artist per-track intact)

6. Report summary
```

### Code breakdown

**Sanitize function** — strips filesystem-unsafe characters:
```bash
sanitize_name() {
    value="${value//\\/ - }"   # backslash → " - "
    value="${value//\// - }"   # forward slash → " - "
    value="${value//:/ - }"    # colon → " - "
    value="${value//\*/ }"     # asterisk → space
    value="${value//\?/ }"     # question mark → space
    value="${value//\"/}"      # quote → removed
    # ... trim whitespace
}
```
Windows-style forbidden characters removed — important because Plex runs cross-platform and these would break file handling.

**Download command:**
```bash
yt-dlp \
  --yes-playlist \
  --js-runtimes node \           # use Node.js for JS challenge solving
  --extract-audio \              # strip video, keep audio
  --audio-format mp3 \
  --audio-quality 0 \            # best quality (VBR)
  --embed-metadata \             # keep YouTube metadata in file
  --embed-thumbnail \            # album art from YouTube thumbnail
  --output "${album_dir}/%(playlist_index)03d - %(title).200B.%(ext)s"
  #                    ↑ zero-padded track number ensures correct sort order
```

**Tag rewrite with ffmpeg:**
```bash
ffmpeg \
  -i "$track_path" \           # input: downloaded MP3
  -map 0 \                     # copy all streams (audio + cover art)
  -c copy \                    # no re-encoding — just rewrite tags
  -map_metadata 0 \            # start from existing metadata
  -id3v2_version 3 \           # ID3v2.3 — broadest Plex compatibility
  -metadata "album=${album_name}" \          # ← key: same for ALL tracks
  -metadata "album_artist=${playlist_uploader}" \
  -metadata "track=${track_index}/${track_total}" \
  -metadata "disc=1/1" \
  "$temp_path"
mv -f "$temp_path" "$track_path"   # replace original
```
`-c copy` means no re-encoding — fast, lossless quality preservation. Only the metadata container is rewritten.

### Dependencies
- `yt-dlp` — YouTube download
- `ffmpeg` — audio tag rewriting
- `node` — required by yt-dlp for JS challenge bypass

---

## Tags
#homelab #argus #scripts #bin #cron #documentation
