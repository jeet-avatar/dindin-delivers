---
phase: quick-327
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [QUICK-327]
must_haves:
  truths:
    - "zietra-meet-service ECS service is RUNNING with RunningCount=1 and no crash loops"
    - "Container connects to Supabase DB without 'password authentication failed' error"
    - "APP_URL env var resolves to https://meet.zietra.com (not meet.vibingticket.com)"
  artifacts:
    - path: "aws secretsmanager (dollor/production/zietra-meet-8vOBAN)"
      provides: "Updated DATABASE_URL pointing to Supabase pooler"
      contains: "lbpkbpfwdpnwlccmlfxn"
    - path: "ECS task definition zietra-meet (new revision)"
      provides: "APP_URL=https://meet.zietra.com"
      contains: "meet.zietra.com"
  key_links:
    - from: "ECS task definition"
      to: "dollor/production/zietra-meet-8vOBAN secret"
      via: "secretsmanager valueFrom ARN"
      pattern: "zietra-meet-8vOBAN"
    - from: "zietra-meet-service"
      to: "new task definition revision"
      via: "aws ecs update-service"
      pattern: "zietra-meet:[0-9]+"
---

<objective>
Fix zietra-meet-service crash loop caused by stale DB credentials and wrong APP_URL.

Purpose: meet.zietra.com is down because the ECS container fails to connect to the DB (dolloradmin user no longer valid) and has the wrong APP_URL env var.
Output: zietra-meet-service running stable with RunningCount=1, connected to Zietra Supabase DB.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

**Secret ARN:** `arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN`
**ECS cluster:** `dollor-production`
**ECS service:** `zietra-meet-service`
**Current task def:** `zietra-meet:3`

**Supabase pooler URL (runtime):**
`postgresql://postgres.lbpkbpfwdpnwlccmlfxn:5nS7ez0pFQRVuUDC6VsU9yJ5PiyrHArv@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=crm&pgbouncer=true&connection_limit=1`

**IMPORTANT:** Do NOT touch any other ECS service in dollor-production. Only zietra-meet-service.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Patch zietra-meet secret with Supabase DATABASE_URL</name>
  <files>AWS Secrets Manager: dollor/production/zietra-meet-8vOBAN</files>
  <action>
1. Read current secret value to get all existing keys (JWT_SECRET, TOKEN_ENCRYPT_KEY, SMTP_USER, SMTP_PASSWORD, and the stale DATABASE_URL):
```
aws secretsmanager get-secret-value \
  --secret-id "arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN" \
  --region us-east-1 \
  --query SecretString \
  --output text
```

2. Parse the JSON output and build a new JSON object that keeps all existing keys unchanged EXCEPT replace DATABASE_URL with:
`postgresql://postgres.lbpkbpfwdpnwlccmlfxn:5nS7ez0pFQRVuUDC6VsU9yJ5PiyrHArv@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=crm&pgbouncer=true&connection_limit=1`

3. Write the updated secret:
```
aws secretsmanager put-secret-value \
  --secret-id "arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN" \
  --region us-east-1 \
  --secret-string '{"DATABASE_URL":"<supabase_pooler_url>","JWT_SECRET":"<preserved>","TOKEN_ENCRYPT_KEY":"<preserved>","SMTP_USER":"<preserved>","SMTP_PASSWORD":"<preserved>"}'
```
Use Python or jq to reconstruct the JSON safely — do NOT hand-edit shell strings with embedded special characters. Use Python one-liner:
```
python3 -c "
import json, subprocess, sys
r = subprocess.run(['aws','secretsmanager','get-secret-value','--secret-id','arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN','--region','us-east-1','--query','SecretString','--output','text'], capture_output=True, text=True)
d = json.loads(r.stdout)
d['DATABASE_URL'] = 'postgresql://postgres.lbpkbpfwdpnwlccmlfxn:5nS7ez0pFQRVuUDC6VsU9yJ5PiyrHArv@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=crm&pgbouncer=true&connection_limit=1'
print(json.dumps(d))
" > /tmp/zietra-meet-secret-updated.json
aws secretsmanager put-secret-value \
  --secret-id "arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN" \
  --region us-east-1 \
  --secret-string file:///tmp/zietra-meet-secret-updated.json
rm /tmp/zietra-meet-secret-updated.json
```
  </action>
  <verify>
```
aws secretsmanager get-secret-value \
  --secret-id "arn:aws:secretsmanager:us-east-1:134607809447:secret:dollor/production/zietra-meet-8vOBAN" \
  --region us-east-1 \
  --query SecretString --output text | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if 'lbpkbpfwdpnwlccmlfxn' in d.get('DATABASE_URL','') else 'FAIL')"
```
Expected output: `OK`
  </verify>
  <done>Secret DATABASE_URL contains `lbpkbpfwdpnwlccmlfxn` (Supabase project ref). All other keys (JWT_SECRET, TOKEN_ENCRYPT_KEY, SMTP_USER, SMTP_PASSWORD) are unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Register new ECS task definition with APP_URL=https://meet.zietra.com</name>
  <files>ECS task definition: zietra-meet (new revision)</files>
  <action>
1. Fetch the current task definition `zietra-meet:3` as JSON:
```
aws ecs describe-task-definition \
  --task-definition zietra-meet:3 \
  --region us-east-1 \
  --query taskDefinition > /tmp/zietra-meet-taskdef.json
```

2. Strip ECS-managed read-only fields and update APP_URL using Python:
```
python3 - << 'PYEOF'
import json

with open('/tmp/zietra-meet-taskdef.json') as f:
    td = json.load(f)

# Remove ECS-managed fields that cannot be re-registered
for key in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes',
            'compatibilities', 'registeredAt', 'registeredBy']:
    td.pop(key, None)

# Update APP_URL in all container definitions
for container in td.get('containerDefinitions', []):
    for env in container.get('environment', []):
        if env['name'] == 'APP_URL':
            old = env['value']
            env['value'] = 'https://meet.zietra.com'
            print(f"Updated APP_URL: {old} -> {env['value']}")

with open('/tmp/zietra-meet-taskdef-new.json', 'w') as f:
    json.dump(td, f, indent=2)

print("New task def written to /tmp/zietra-meet-taskdef-new.json")
PYEOF
```

3. Register the new revision:
```
aws ecs register-task-definition \
  --region us-east-1 \
  --cli-input-json file:///tmp/zietra-meet-taskdef-new.json
```

4. Capture the new revision number from the output (look for `"revision": N` in the response).

5. Cleanup temp files:
```
rm /tmp/zietra-meet-taskdef.json /tmp/zietra-meet-taskdef-new.json
```
  </action>
  <verify>
```
aws ecs describe-task-definition \
  --task-definition zietra-meet \
  --region us-east-1 \
  --query "taskDefinition.containerDefinitions[*].environment[?name=='APP_URL'].value" \
  --output text
```
Expected output: `https://meet.zietra.com`

Also verify revision is higher than 3:
```
aws ecs describe-task-definition \
  --task-definition zietra-meet \
  --region us-east-1 \
  --query "taskDefinition.revision" \
  --output text
```
Expected: `4` (or higher)
  </verify>
  <done>New task definition revision exists with APP_URL=https://meet.zietra.com. The latest revision number is 4 (or higher). No other container environment variables were changed.</done>
</task>

<task type="auto">
  <name>Task 3: Update ECS service to new task definition and force redeploy, then verify stable</name>
  <files>ECS service: zietra-meet-service in cluster dollor-production</files>
  <action>
1. Update the service to use the new task definition (latest revision) and force a new deployment. Use the revision number from Task 2 (substitute N):
```
NEW_REVISION=$(aws ecs describe-task-definition \
  --task-definition zietra-meet \
  --region us-east-1 \
  --query "taskDefinition.revision" \
  --output text)

aws ecs update-service \
  --cluster dollor-production \
  --service zietra-meet-service \
  --task-definition "zietra-meet:${NEW_REVISION}" \
  --force-new-deployment \
  --region us-east-1
```

2. Wait for the service to stabilize (max 5 minutes):
```
aws ecs wait services-stable \
  --cluster dollor-production \
  --services zietra-meet-service \
  --region us-east-1
```
If `wait` times out (exit code non-zero), check service events:
```
aws ecs describe-services \
  --cluster dollor-production \
  --services zietra-meet-service \
  --region us-east-1 \
  --query "services[0].events[:5]"
```

3. Check final running count and task definition in use:
```
aws ecs describe-services \
  --cluster dollor-production \
  --services zietra-meet-service \
  --region us-east-1 \
  --query "services[0].{runningCount:runningCount,desiredCount:desiredCount,taskDef:taskDefinition,status:status}"
```

4. Tail recent container logs to confirm no DB auth errors (substitute TASK_ID from the running task):
```
TASK_ID=$(aws ecs list-tasks \
  --cluster dollor-production \
  --service-name zietra-meet-service \
  --region us-east-1 \
  --query "taskArns[0]" \
  --output text | awk -F/ '{print $NF}')

aws logs get-log-events \
  --log-group-name /ecs/zietra-meet \
  --log-stream-name "ecs/zietra-meet/${TASK_ID}" \
  --region us-east-1 \
  --limit 30 \
  --query "events[*].message" \
  --output text
```
(Adjust log group/stream names if different — check CloudWatch log groups for `zietra-meet` pattern if the above fails)

5. Do a final HTTP health check:
```
curl -s -o /dev/null -w "%{http_code}" https://meet.zietra.com/health 2>/dev/null || \
curl -s -o /dev/null -w "%{http_code}" https://meet.zietra.com/ 2>/dev/null
```
  </action>
  <verify>
```
aws ecs describe-services \
  --cluster dollor-production \
  --services zietra-meet-service \
  --region us-east-1 \
  --query "services[0].{running:runningCount,desired:desiredCount,task:taskDefinition}" \
  --output table
```
Expected: `running=1`, `desired=1`, task definition shows `zietra-meet:4` (or the new revision).

Container logs must NOT contain `password authentication failed for user "dolloradmin"`.
  </verify>
  <done>
- zietra-meet-service runningCount=1, desiredCount=1, status=ACTIVE
- Task definition in use is the new revision (zietra-meet:4+) with APP_URL=https://meet.zietra.com
- Container logs show successful DB connection (no dolloradmin auth failure)
- meet.zietra.com returns HTTP 200 (or expected app response, not 502/503)
  </done>
</task>

</tasks>

<verification>
1. Secret DATABASE_URL contains Supabase project ref `lbpkbpfwdpnwlccmlfxn` — confirmed via get-secret-value
2. Task definition latest revision has APP_URL=https://meet.zietra.com — confirmed via describe-task-definition
3. ECS service running with new task def revision, runningCount=1 — confirmed via describe-services
4. No `dolloradmin` auth errors in container logs — confirmed via CloudWatch
5. meet.zietra.com responds (HTTP 200 or app page) — confirmed via curl
</verification>

<success_criteria>
- meet.zietra.com is reachable and serving responses (not 502/503)
- zietra-meet-service shows runningCount=1 in ECS console
- Container logs free of "password authentication failed for user dolloradmin"
- No Dollor.ai services were touched
</success_criteria>

<output>
After completion, create `.planning/quick/327-fix-meet-zietra-com-update-zietra-meet-s/327-SUMMARY.md`
</output>
