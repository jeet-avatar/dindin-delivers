---
phase: quick-327
plan: 01
subsystem: infrastructure/ecs
tags: [zietra-meet, ecs, secrets-manager, database, deployment]
dependency_graph:
  requires: []
  provides: [zietra-meet-service-stable, meet.zietra.com-live]
  affects: [meet.zietra.com]
tech_stack:
  added: []
  patterns: [aws-secrets-manager-update, ecs-task-def-revision, ecs-force-new-deployment]
key_files:
  created: []
  modified:
    - "AWS Secrets Manager: arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN"
    - "ECS Task Definition: zietra-meet:4"
    - "ECS Service: dollor-production/zietra-meet-service"
decisions:
  - "Used Python one-liner to safely reconstruct JSON secret (avoids shell escaping issues with special chars in DB password)"
  - "Registered task def revision 4 from revision 3, only changing APP_URL env var"
  - "Used --force-new-deployment so ECS drains old task and starts new one with updated secret"
metrics:
  duration: "7m 19s"
  completed: "2026-05-09T07:10:59Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 0
---

# Quick 327: Fix meet.zietra.com — Update zietra-meet Secret and Redeploy

**One-liner:** Patched Secrets Manager DATABASE_URL to Supabase pooler, registered ECS task def zietra-meet:4 with APP_URL=https://meet.zietra.com, force-redeployed; service stable with runningCount=1 and meet.zietra.com returning HTTP 200.

## Tasks Completed

| Task | Name | Commit | Result |
|------|------|--------|--------|
| 1 | Patch zietra-meet-8vOBAN secret with Supabase DATABASE_URL | `deaf3c23` | Secret updated, version dfa1b671 |
| 2 | Register new ECS task definition zietra-meet:4 with APP_URL=https://meet.zietra.com | `11a7cce1` | Revision 4 ACTIVE |
| 3 | Update ECS service to zietra-meet:4, force redeploy, verify stable | `da57c17a` | runningCount=1, HTTP 200 |

## Verification Evidence

### 1. Secret DATABASE_URL contains Supabase project ref `lbpkbpfwdpnwlccmlfxn`
```
Verification: OK
Keys: ['DATABASE_URL', 'JWT_SECRET', 'TOKEN_ENCRYPT_KEY', 'SMTP_USER', 'SMTP_PASSWORD']
```

### 2. Task definition revision 4 has APP_URL=https://meet.zietra.com
```
Latest revision: 4
APP_URL: https://meet.zietra.com
PASS
```

### 3. ECS service running with zietra-meet:4, runningCount=1
```
| desired | 1                                                                  |
| running | 1                                                                  |
| task    | arn:aws:ecs:us-east-1:134607809447:task-definition/zietra-meet:4   |
```

### 4. No dolloradmin auth errors in container logs
```
Zietra Meet running at http://localhost:3001 (max 8/room)
```
(Clean startup — no "password authentication failed for user dolloradmin")

### 5. meet.zietra.com HTTP health check
```
HTTP status: 200
Total time: 0.400234s
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- Secret `dollor/production/zietra-meet-8vOBAN` contains `lbpkbpfwdpnwlccmlfxn`: VERIFIED
- Task definition `zietra-meet:4` has `APP_URL=https://meet.zietra.com`: VERIFIED
- ECS service `zietra-meet-service` runningCount=1: VERIFIED
- No `dolloradmin` auth errors in container logs: VERIFIED
- `meet.zietra.com` returns HTTP 200: VERIFIED
- No Dollor.ai services were touched: CONFIRMED (only zietra-meet-service operated on)
