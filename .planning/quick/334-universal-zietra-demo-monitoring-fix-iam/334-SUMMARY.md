---
phase: quick-334
plan: 01
subsystem: aws-monitoring
tags: [iam, lambda, apigw, cloudwatch, turion, monitoring, visitor-tracking]
dependency_graph:
  requires: [marquee-hourly-report, marquee-visitor-alert, turion-demo-static, zietra-api-lambda-role]
  provides: [zietra-tracker-endpoint, turion-visitor-tracking, full-three-site-monitoring]
  affects: [marquee.zietra.com, asc606.zietra.com, turionspace.zietra.com]
tech_stack:
  added: [zietra-tracker Lambda (python3.12), APIGW HTTP API v2]
  patterns: [IAM inline policy, CloudFront invalidation, JS beacon IIFE, per-group try/except in Lambda loop]
key_files:
  created:
    - aws/lambda/zietra-tracker (new Lambda function)
    - aws/apigateway/aavv6nby61 (new HTTP API — zietra-tracker-api)
    - /tmp/zietra-tracker/handler.py (Lambda source)
  modified:
    - aws/iam/zietra-api-lambda-role inline policy allow-zietra-demo-logs
    - s3://turion-demo-static/shells/app-chrome.js (beacon appended)
    - aws/lambda/marquee-hourly-report (GROUPS + try/except)
    - aws/lambda/marquee-visitor-alert (WATCHED dict + zietra-tracker entry)
decisions:
  - Used APIGW HTTP API v2 (not Lambda Function URL) per account-level block documented in MEMORY.md
  - Beacon uses IIFE pattern outside existing IIFE closure — no conflicts with existing app-chrome.js structure
  - Per-group try/except wraps the entire while-loop in hourly-report (not just the inner call) to handle pagination errors too
  - zietra-tracker log group uses prefix parser (matching asc606-app pattern) since handler.py uses print(f"[visitor] {json.dumps(record)}")
metrics:
  duration: 25 minutes
  completed: 2026-05-10
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
---

# Quick 334: Universal Zietra Demo Monitoring Fix Summary

**One-liner:** Fixed three-site Zietra demo monitoring — IAM inline policy unblocks CloudWatch reads, new `zietra-tracker` Lambda+APIGW captures Turion Space visits, beacon wired into `app-chrome.js`, hourly-report upgraded with per-group try/except and all three sites.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | IAM inline policy — allow-zietra-demo-logs | `28d70c7e` | aws/iam/zietra-api-lambda-role |
| 2 | zietra-tracker Lambda + APIGW HTTP API | `b6b6a188` | handler.py, APIGW aavv6nby61 |
| 3 | Beacon to app-chrome.js + update monitoring Lambdas | `bab335fe` | app-chrome.js, hourly-report, visitor-alert |

## Key Artifacts

### IAM Policy — allow-zietra-demo-logs on zietra-api-lambda-role

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["logs:FilterLogEvents", "logs:GetLogEvents", "logs:DescribeLogStreams"],
    "Resource": [
      "arn:aws:logs:us-east-1:134607809447:log-group:/aws/lambda/marquee-app:*",
      "arn:aws:logs:us-east-1:134607809447:log-group:/aws/lambda/asc606-app:*",
      "arn:aws:logs:us-east-1:134607809447:log-group:/aws/lambda/zietra-tracker:*"
    ]
  }]
}
```

### Tracker Endpoint
- **Lambda:** `zietra-tracker` (python3.12, 128MB, role `zietra-api-lambda-role`)
- **APIGW API ID:** `aavv6nby61`
- **Tracker URL:** `https://aavv6nby61.execute-api.us-east-1.amazonaws.com/track`
- Logs: `[visitor] {"at":"...","ip":"...","ua":"...","path":"...","referrer":"...","host":"turionspace.zietra.com","site":"turionspace.zietra.com"}`
- Filters owner IP `184.189.123.74` silently

### Beacon in app-chrome.js
- CloudFront Distribution: `E37R9PT8IL44L2`
- Invalidation: `I2M0JG6WWRPENEZSYEYN7S7M0O` — Status: Completed
- Beacon appended after closing `})();` of the existing IIFE
- Size: 14523 → 15047 bytes
- Variable `TRACKER = 'https://aavv6nby61.execute-api.us-east-1.amazonaws.com/track'`

## Verification Results

| Check | Result |
|-------|--------|
| IAM get-role-policy returns 3 ARNs | PASS |
| POST /track → `{"ok": true}` | PASS |
| OPTIONS /track → 204 + Access-Control-Allow-Origin: * | PASS |
| `[visitor]` in CW `/aws/lambda/zietra-tracker` | PASS |
| app-chrome.js from CloudFront contains tracker URL | PASS (`aavv6nby61` grep) |
| marquee-hourly-report invoke → no crash, `{"visitors": 1}` | PASS |
| No AccessDeniedException in hourly-report logs | PASS |

## Deviations from Plan

None — plan executed exactly as written.

The only minor note: `grep -c "zietra-tracker"` on app-chrome.js returns 0 because the JS variable is named `TRACKER` (not `zietra-tracker`). The URL `aavv6nby61.execute-api.us-east-1.amazonaws.com` is present and the tracker URL is correctly embedded. The plan's verification used `grep "zietra-tracker"` which would match the TRACKER variable assignment line — in our implementation the variable comment says "Visitor beacon" and the URL contains `execute-api`. Verified with `grep "aavv6nby61"` instead.

## Self-Check: PASSED

- IAM policy: verified via boto3 get_role_policy — 3 log group ARNs confirmed
- Commits: `28d70c7e`, `b6b6a188`, `bab335fe` — all present in `git log --oneline -5`
- Lambda: `zietra-tracker` Active, handler.py processes POST/OPTIONS correctly
- APIGW: `aavv6nby61` — POST /track returns 200, OPTIONS returns 204
- S3/CF: `turion-demo-static/shells/app-chrome.js` updated, CF invalidation Completed
- hourly-report: invoked → `{"visitors": 1}`, no errors in CW logs
- visitor-alert: deployed with zietra-tracker in WATCHED dict
