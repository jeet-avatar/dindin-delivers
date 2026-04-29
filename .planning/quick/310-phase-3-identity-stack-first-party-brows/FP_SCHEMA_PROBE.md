# Quick Task 310 — Phase 3 Identity Stack — Schema Migration Probe

**Date:** 2026-04-29
**Probe URL:** `https://techcloudpro.com/api/_probe-310-fp-schema.php?s=TcpSecureAdmin2026`
**Status:** Probe deployed → executed → output captured → DELETED from server (verified 404).

## Migration Result

```json
"migrations": [
    { "step": "identified_visitors.device_fingerprint", "result": "OK" },
    { "step": "page_views.device_fingerprint",          "result": "OK" }
]
```

Both ALTER TABLE statements executed cleanly on `u350621741_visitors` (Hostinger MariaDB).

## DESCRIBE identified_visitors (verbatim, post-migration)

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | null | auto_increment |
| visitor_id | varchar(64) | NO | UNI | null |  |
| email | varchar(255) | NO | MUL | null |  |
| name | varchar(255) | YES |  | null |  |
| company | varchar(255) | YES |  | null |  |
| phone | varchar(64) | YES |  | null |  |
| source_form | varchar(64) | NO |  | null |  |
| first_seen_ip | varchar(45) | YES |  | null |  |
| first_seen_at | timestamp | YES |  | current_timestamp() |  |
| last_seen_at | timestamp | YES |  | current_timestamp() | on update current_timestamp() |
| **device_fingerprint** | **varchar(64)** | **YES** | **MUL** | **null** | **— NEW** |

## DESCRIBE page_views (verbatim, post-migration)

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | null | auto_increment |
| session_id | varchar(64) | YES | MUL | null |  |
| visitor_id | varchar(64) | YES | MUL | null |  |
| page | varchar(500) | YES | MUL | null |  |
| referrer | varchar(500) | YES |  | null |  |
| device | varchar(20) | YES |  | null |  |
| browser | varchar(50) | YES |  | null |  |
| country | varchar(100) | YES |  | null |  |
| region | varchar(100) | YES |  | "" |  |
| city | varchar(100) | YES |  | null |  |
| org | varchar(255) | YES | MUL | "" |  |
| timezone | varchar(100) | YES |  | "" |  |
| utm_source | varchar(100) | YES | MUL | "" |  |
| utm_medium | varchar(100) | YES |  | "" |  |
| utm_campaign | varchar(100) | YES |  | "" |  |
| utm_term | varchar(100) | YES |  | "" |  |
| utm_content | varchar(100) | YES |  | "" |  |
| scroll_depth | tinyint(4) | YES |  | 0 |  |
| time_on_page | int(11) | YES |  | 0 |  |
| ip | varchar(45) | YES |  | null |  |
| duration | int(11) | YES |  | 0 |  |
| created_at | timestamp | YES | MUL | current_timestamp() |  |
| **device_fingerprint** | **varchar(64)** | **YES** | **MUL** | **null** | **— NEW** |

## Probe Cleanup

```bash
$ ssh ... 'rm /home/.../api/_probe-310-fp-schema.php && ls /home/.../api/_probe-310-fp-schema.php 2>&1'
ls: cannot access '/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-310-fp-schema.php': No such file or directory
```

Probe file removed from server. Schema migration complete.
