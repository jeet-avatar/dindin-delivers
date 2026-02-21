---
status: resolved
trigger: "staging-ecs-deploy-timeout"
created: 2026-02-21T00:45:00Z
updated: 2026-02-21T00:45:00Z
---

## Current Focus

hypothesis: Two compounding issues cause deploy to exceed 10-min waiter: (1) first task killed by ALB health check because healthCheckGracePeriod=60s is too short for 0.25 vCPU startup, (2) 300s deregistration delay creates 5-min gap before retry, totaling ~11 min
test: Fix all three issues (grace period, dereg delay, waiter timeout) and redeploy
expecting: Deploy completes within 10 minutes without task churn
next_action: Verify by triggering staging deploy and confirming it completes within timeout

## Symptoms

expected: Deploy staging workflow completes successfully within reasonable time
actual: aws ecs wait services-stable times out at 10 min, but deployment actually succeeds at ~11 min
errors: "Waiter ServicesStable failed: Max attempts exceeded" (exit code 255)
reproduction: gh workflow run deploy-staging.yml --ref main
started: 2026-02-21T00:13:57Z deploy; previous deploy succeeded (7m6s)

## Eliminated

(none - root cause found on first investigation)

## Evidence

- timestamp: 2026-02-21T00:45:00Z
  checked: ECS service config
  found: healthCheckGracePeriod=60s, minimumHealthyPercent=100, maximumPercent=200, desiredCount=1
  implication: With minHealthy=100 and desired=1, ECS must keep old task running until new task is healthy

- timestamp: 2026-02-21T00:45:00Z
  checked: ALB target group health check config
  found: interval=30s, healthy=2, unhealthy=3, timeout=5s, path=/
  implication: ALB needs 3 consecutive fails (90s) to declare unhealthy, 2 consecutive passes (60s) to declare healthy

- timestamp: 2026-02-21T00:45:00Z
  checked: ALB target group attributes
  found: deregistration_delay.timeout_seconds=300 (5 MINUTES!)
  implication: When old task deregisters, ALB waits 300s to drain connections - massive delay for staging with 0 traffic

- timestamp: 2026-02-21T00:45:00Z
  checked: ECS task definition
  found: cpu=512, memory=1024, container health check: curl -f http://localhost:8080/ with startPeriod=90, retries=3, interval=30
  implication: Container-level health check has 90s start period, reasonable for this size

- timestamp: 2026-02-21T00:45:00Z
  checked: ECS events timeline
  found: Task 1019 started at 00:18:06, registered in TG at 00:18:36, declared UNHEALTHY at 00:19:47 (+101s), stopped immediately. Then 6.1 min gap. Task b810 started at 00:25:55, healthy at 00:28:37. Total deploy time: 11.0 min.
  implication: First task failed ALB health checks within grace period, 300s dereg delay caused 6.1 min gap, second attempt succeeded but total exceeded 10 min waiter

- timestamp: 2026-02-21T00:45:00Z
  checked: deploy-staging.yml waiter config
  found: Plain `aws ecs wait services-stable` with no custom timeout - default is 40 attempts * 15s = 600s = 10 min
  implication: 10 min is barely enough even without task churn; with first-task failure it's guaranteed to exceed

## Resolution

root_cause: Three compounding issues cause the 10-minute CI waiter to be exceeded:
  1. ECS healthCheckGracePeriod=60s is too short - ALB declares the new task unhealthy before the app (on 0.25 vCPU) finishes booting, causing ECS to kill task 1 and retry
  2. ALB deregistration_delay=300s (default) creates a 5-minute wait between the failed task being removed and traffic shifting, adding massive dead time
  3. The `aws ecs wait services-stable` command uses default 10-minute timeout, which is not enough when task churn occurs (task1 boot+fail ~100s + dereg delay ~370s + task2 boot+healthy ~160s = ~630s > 600s)

fix: Three changes applied:
  1. ALB deregistration_delay: 300s -> 30s (via aws elbv2 modify-target-group-attributes) — staging has no real traffic to drain
  2. ECS healthCheckGracePeriod: 60s -> 120s (via aws ecs update-service) — prevents ALB from killing new task before it boots
  3. CI waiter: replaced `aws ecs wait services-stable` (10 min default) with custom polling loop (15 min timeout, progress logging, rollout state checking)
verification: Infrastructure changes confirmed via AWS CLI (dereg_delay=30s, grace_period=120s). Workflow YAML validated. Timeline analysis shows worst-case ~6.3 min (was ~10.5 min), well within 15-min waiter. Full e2e verification requires next staging deploy.
files_changed:
  - .github/workflows/deploy-staging.yml (lines 232-276: replaced aws ecs wait with custom polling loop)
