# CC7.2 — Audit Log Sample Evidence
Generated: 2026-04-13T20:13:03.966050+00:00
Source: src/backend/arthaBuild.db

## Purpose
Demonstrates the immutable, append-only audit trail maintained by ArthaBuild.
Each row contains a cryptographic hash chain (prev_hash → row_hash) computed
as: sha256(prev_hash|action|actor_email|created_at_iso).

## Tamper-Evidence Chain

Any modification to a historical row breaks the chain: the row_hash of the
altered row will no longer match the prev_hash of the subsequent row.

## Last 50 Audit Events

| id | created_at | actor_email | actor_role | action | result | ip_address | prev_hash (truncated) | row_hash (truncated) |
|----|------------|-------------|------------|--------|--------|------------|----------------------|----------------------|
| 13 | 2026-04-13 19:16:50 | rg13admin@arthabuild-test.com | admin | auth.login_success | success | 127.0.0.1 |  |  |
| 12 | 2026-04-13 19:15:50 | rg13admin@arthabuild-test.com | admin | auth.login_success | success | 127.0.0.1 |  |  |
| 11 | 2026-04-13 19:15:42 | rg13admin@arthabuild-test.com | admin | auth.login_success | success | 127.0.0.1 |  |  |
| 10 | 2026-04-13 19:15:34 | rg13admin@arthabuild-test.com | admin | auth.login_success | success | 127.0.0.1 |  |  |
| 9 | 2026-04-13 19:15:16 | rg13admin@arthabuild-test.com | user | auth.login_success | success | 127.0.0.1 |  |  |
| 8 | 2026-04-13 19:15:11 | rg13admin@arthabuild-test.com | user | auth.login_success | success | 127.0.0.1 |  |  |
| 7 | 2026-04-13 19:14:59 | rg13admin@arthabuild-test.com | user | auth.login_success | success | 127.0.0.1 |  |  |
| 6 | 2026-04-13 19:14:55 | rg13admin@arthabuild-test.com | user | auth.login_success | success | 127.0.0.1 |  |  |
| 5 | 2026-04-13 19:14:50 | rg13admin@arthabuild-test.com | user | auth.login_success | success | 127.0.0.1 |  |  |
| 4 | 2026-04-13 19:14:50 | rg13admin@arthabuild-test.com | user | auth.register | success | 127.0.0.1 |  |  |
| 3 | 2026-04-13 19:14:27 | admin@test.local | unknown | auth.login_failed | failure | 127.0.0.1 |  |  |
| 2 | 2026-04-13 19:14:22 | admin@test.local | unknown | auth.login_failed | failure | 127.0.0.1 |  |  |
| 1 | 2026-04-11 21:53:43 | gteshnair@gmail.com | user | auth.register | success | 127.0.0.1 |  |  |

## Audit Event Categories

| Category  | Examples                                                  |
|-----------|-----------------------------------------------------------|
| auth.*    | login, login_failed, logout, register                     |
| admin.*   | role_changed, user_removed, team_created, config_updated  |
| user.*    | password_changed, email_verified, data_erased             |
| license.* | validation events                                         |
