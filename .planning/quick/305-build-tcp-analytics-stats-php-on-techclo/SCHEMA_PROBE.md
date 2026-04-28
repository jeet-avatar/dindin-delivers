# TCP Analytics — Live DB Schema Probe

**Probed at:** 2026-04-28T17:33:53Z
**Source:** Hostinger MySQL `u350621741_visitors` via PDO localhost (creds in techcloudpro/api/chat.php:141-145)
**Endpoint:** `/tcp-analytics/tcp-stats-probe.php?s=TcpSecureAdmin2026` (deleted post-probe)
**Tool:** `/tmp/tcp-stats-probe.php` (deleted locally)

## Why this exists

The plan requires anti-hallucination evidence — we cannot guess column names for the stats.php queries. This file captures the live `DESCRIBE` output so the SQL in stats.php matches the real schema.

## All tables found

```
events
page_views
playground_submissions
security_events
study_guide_leads
```

## Decision: stats.php queries the `page_views` table

`page_views` holds 1,629 rows of page-level visitor data — this is the primary pageview source written by `tracker.js` (loaded from `/tcp-analytics/tracker.js` on every entry page).

`events` (133 rows) holds discrete user events (chat_message, click, etc.) — NOT pageviews — so it's not the right source for "pageview counts".

## `page_views` schema (1,629 rows)

| Column        | Type           | Notes                          |
|---------------|----------------|--------------------------------|
| id            | int(11) PK     | auto_increment                 |
| session_id    | varchar(64)    | indexed (MUL)                  |
| page          | varchar(500)   | indexed (MUL) — URL path       |
| referrer      | varchar(500)   |                                |
| device        | varchar(20)    |                                |
| browser       | varchar(50)    |                                |
| country       | varchar(100)   |                                |
| region        | varchar(100)   |                                |
| city          | varchar(100)   |                                |
| org           | varchar(255)   | indexed (MUL)                  |
| timezone      | varchar(100)   |                                |
| utm_source    | varchar(100)   | indexed (MUL)                  |
| utm_medium    | varchar(100)   |                                |
| utm_campaign  | varchar(100)   |                                |
| utm_term      | varchar(100)   |                                |
| utm_content   | varchar(100)   |                                |
| scroll_depth  | tinyint(4)     |                                |
| time_on_page  | int(11)        |                                |
| ip            | varchar(45)    |                                |
| duration      | int(11)        |                                |
| created_at    | timestamp      | **indexed (MUL)** — time series |

## `events` schema (133 rows — not used by stats.php)

| Column      | Type         |
|-------------|--------------|
| id          | int(11) PK   |
| session_id  | varchar(64)  |
| event_type  | varchar      |
| element     | varchar      |
| value       | varchar      |
| page        | varchar(500) |
| created_at  | timestamp    |

## Column names stats.php will use

- **TABLE:** `page_views`
- **TS_COL:** `created_at`     (timestamp, indexed)
- **SESS_COL:** `session_id`   (varchar, indexed)
- **PAGE_COL:** `page`         (varchar, indexed)

All four columns confirmed present and indexed — queries will be fast even on full table scans for the time windows.

## Sample row (id=3137)

```json
{
  "id": 3137,
  "session_id": "6k8hp62ef02moivtwzr",
  "page": "/blog/ai-in-financial-services-use-cases/",
  "referrer": "https://chatgpt.com/",
  "device": "desktop",
  "browser": "Chrome",
  "country": "Italy",
  "city": "Milan",
  "created_at": "<timestamp>"
}
```

## Probe cleanup verification

After probe ran successfully, the file was deleted from the server. See main 305-SUMMARY.md for the verification curl that returns 404.
