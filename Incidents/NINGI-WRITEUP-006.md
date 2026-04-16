# NINGI-WRITEUP-006 — ZNC Compromise & Argus Rebuild

> The incident that led to the current argus build. A weak ZNC credential allowed shell access, which was used to run a cryptominer. The host was rebuilt from scratch and became the current hardened argus baseline.

---

## Summary

| Field | Value |
|-------|-------|
| Incident ID | NINGI-WRITEUP-006 |
| Host affected | Old Ubuntu host (argus predecessor) |
| Initial access | Cracked SHA-256 ZNC webadmin password |
| Impact | Cryptominer running in `/tmp`, full shell access via ZNC shell module |
| Resolution | Full host rebuild |
| Outcome | Current argus with mandatory auditd + Wazuh baseline |

---

## What Happened

### Initial Access
The attacker cracked a SHA-256 hashed ZNC webadmin password. ZNC's webadmin interface (then exposed) provided a login portal. A weak or reused password was sufficient to gain entry.

> **Learning:** SHA-256 without a salt or with a predictable password is trivially crackable with modern GPU hashcat rigs. Use bcrypt/argon2 for stored credentials. Never expose webadmin interfaces publicly.

### Privilege Escalation / Lateral Movement
ZNC has a **shell module** that allows running OS commands from within the IRC bouncer. Once authenticated to webadmin, the attacker enabled or used the shell module to execute arbitrary commands on the underlying host.

> **Learning:** Application-level features like "shell modules" in IRC bouncers are dangerous attack surface. Audit installed ZNC modules and disable anything that allows OS command execution unless absolutely required.

### Impact
The attacker deployed a **cryptominer** in `/tmp`. Common attacker behaviour on compromised servers — low-noise, financially motivated, uses available CPU/GPU resources.

`/tmp` is a common staging area because:
- World-writable by default
- Files survive across processes
- Often has execute permissions
- Not monitored as closely as home directories

> **Learning:** Monitor `/tmp` for execution events. `noexec` on `/tmp` in fstab prevents binaries from running there. Wazuh FIM rules watching `/tmp` for new executables catch this pattern.

### Detection
The compromise was eventually detected. The fact that it was running a cryptominer — a noisy, resource-intensive process — likely made it discoverable via CPU monitoring or unusual load.

> **Learning:** Cryptominers are loud. Monitoring CPU usage (`node-exporter` + Grafana thresholds) would catch this faster than log review. A properly configured SIEM with process execution rules catches the initial execution before it has time to run.

---

## Response

The old host was rebuilt from scratch rather than attempted remediation. This is the correct response when:

- The full scope of access is unknown
- The host had no integrity baseline (no FIM, no auditd)
- The attacker had shell access (rootkit risk)

Rebuilding from scratch guarantees a clean state. Trying to "clean" a compromised host without a verified baseline is guesswork.

---

## What Changed — The Argus Baseline

The rebuild established the current mandatory security controls on argus:

| Control | Why it was added |
|---------|-----------------|
| auditd | Kernel-level syscall auditing — catches process exec, file reads, privilege changes in real time |
| Wazuh agent | SIEM integration — events ship to the central manager for correlation and alerting |
| ZNC webadmin on Tailscale only | Webadmin no longer publicly reachable |
| SSH hardening | Port changed to 2233, access limited to LAN + Tailscale |
| UFW with explicit rules | Deny-by-default posture, no implicit exposure |
| Honeytoken files | High-confidence attacker detection on fuji |
| Discord alerting | Real-time notification within 60 seconds |

> The philosophy shift: security monitoring is not optional on homelab infrastructure that runs public-facing services. auditd + Wazuh are treated as mandatory controls, not optional additions.

---

## Lessons Learned

1. **Weak passwords on internet-facing admin panels are high-risk.** ZNC webadmin should never be publicly exposed. Now it's Tailscale only.
2. **SHA-256 is not suitable for password storage.** Use a proper password hashing algorithm with a salt and cost factor.
3. **Application shell modules are privilege escalation paths.** Any feature that lets an application run OS commands should be audited and disabled unless needed.
4. **Without auditd/FIM, you have no integrity baseline.** You can't know what changed, when, or by whom. The attacker could have been present for days or weeks.
5. **Rebuilding is often the right answer.** Once shell access is confirmed, assume full compromise. Clean rebuilds guarantee known-good state; "cleaning" an infected host without a baseline does not.
6. **Cryptominers are a symptom, not the worst case.** An attacker with shell access on a homelab host has access to everything running there — IRC logs, credentials, internal network topology.

---

## Public Write-Up

This incident is documented in the public security research portfolio at `pagzlol/homelab-security-research` as NINGI-WRITEUP-006.

---

## Tags
#homelab #incident #znc #compromise #argus #security-research #rebuild
