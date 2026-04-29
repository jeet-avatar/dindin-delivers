# 314-SCHEMA_PROBE.md — Anti-hallucination evidence

**Date:** 2026-04-29 (UTC)
**Task:** quick-314 (unified lead notification system)
**Probe path:** `/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-314-schema.php` (DELETED post-use)
**Probe URL:** `https://techcloudpro.com/api/_probe-314-schema.php` (verified 404 after delete)

## Migration

```json
{ "migration": "OK" }
```

`ALTER TABLE identified_visitors ADD COLUMN last_notified_at TIMESTAMP NULL DEFAULT NULL` succeeded — column did not exist prior. Idempotent path (catch `Duplicate column name`) was untriggered.

## Verbatim DESCRIBE identified_visitors output

| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
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
| device_fingerprint | varchar(64) | YES | MUL | null |  |
| company_domain | varchar(255) | YES | MUL | null |  |
| **last_notified_at** | **timestamp** | **YES** |  | **null** |  |

`last_notified_at` is the LAST column (added Apr 29, 2026 by this probe). 13 columns total. The previous columns match the schemas captured in 307/310/312 SUMMARYs — additive change only, no regressions.

## Cleanup verification

```
$ ssh ... "rm /home/.../api/_probe-314-schema.php"
$ curl -sI -A "<safari UA>" -o /dev/null -w "%{http_code}" "https://techcloudpro.com/api/_probe-314-schema.php"
404
```

Probe file removed from server.
