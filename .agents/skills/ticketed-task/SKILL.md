# Ticketed Task Skill

## Rule: Every GSD task MUST create a Change Request ticket

This rule applies to ALL GSD workflows: `/gsd:quick`, `/gsd:execute-phase`, `/gsd:debug`.

### Before Code Changes

The executor (or orchestrator for quick tasks) MUST:

1. **Create a Change Request** on the admin portal:
   ```bash
   curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "<GSD task description>",
       "description": "<What will change and why>",
       "change_type": "<code|config|docs|infrastructure>",
       "priority": "<Critical|High|Medium|Low>",
       "requested_by": "support@dollor.ai"
     }'
   ```

2. **Extract the `cr_id`** from the response (e.g., `CR-0042`)

3. **Submit for review** (auto-approves for system actor):
   ```bash
   curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
   ```

4. **Include CR ID in commit messages**: `feat(quick-125): [CR-0042] description here`

### After Code Changes

5. **Transition to PR Created** (if branch/PR workflow):
   ```bash
   curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/transition?secret_key=$ADMIN_SECRET_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "new_status": "PR Created",
       "metadata": {"branch_name": "<branch>", "pr_url": "<url>", "pr_number": <num>},
       "actor_email": "system@dollor.ai",
       "role": "system"
     }'
   ```

6. **Transition through deploy stages** as work progresses:
   - `In Progress` → when executor starts
   - `PR Created` → when branch pushed (phase tasks only)
   - `CI Running` → when CI triggered, with `ci_run_id`
   - `Staging` → when deployed to staging
   - `Production` → when deployed to production
   - `Verified` → when smoke tests pass

### Quick Tasks (direct to main)

For `/gsd:quick` (no branch/PR), transition path is shorter:
- Create CR → Submit → In Progress → Staging → Production → Verified

### Priority Mapping

| GSD Context | CR Priority |
|-------------|------------|
| HOTFIX, security fix | Critical |
| Bug fix, deploy-only | High |
| Feature, enhancement | Medium |
| Docs, audit, research | Low |

### ADMIN_SECRET_KEY

The key is stored in AWS Secrets Manager: `dollor/production/admin-yCDIFY`.
For local/CI use, set `ADMIN_SECRET_KEY` env var.

If the key is not available, log a warning and continue — don't block the task.
