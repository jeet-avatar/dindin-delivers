# Reusable Task Prompt Template

Copy-paste one of these for every task. Replace `<placeholders>`.

---

## For Quick Tasks (bug fixes, small changes)

```
/gsd:quick <description>
```

That's it. The GSD executor will automatically:
1. Read `.agents/skills/ticketed-task/SKILL.md`
2. Create a CR ticket on the admin portal
3. Submit it for review
4. Include CR ID in commit messages
5. Transition CR through deploy stages

---

## For Non-Trivial Features (multi-file, multi-step)

```
/gsd:plan-phase <N>
```

Then execute with:
```
/gsd:execute-phase <N>
```

This will:
1. Create a feature branch (`gsd/phase-<N>-<slug>`)
2. Create a CR ticket per plan
3. Commit to the branch
4. Push branch + create PR via `gh pr create`
5. Transition CR: In Progress → PR Created → CI Running → Staging → Production

---

## For Bug Investigation

```
/gsd:debug <what's broken>
```

---

## For Hotfixes (Critical, skip research)

```
/gsd:quick --full HOTFIX: <description>
```

The `--full` flag adds plan-checking + verification. The skill auto-maps HOTFIX to Critical priority on the CR.

---

## Full Manual Prompt (when you need max control)

```
Create a Change Request ticket first, then use /gsd:quick to implement:

Title: <clear title>
Type: <code|config|docs|infrastructure>
Priority: <Critical|High|Medium|Low>
Description: <what changes and why>

Then implement: <detailed requirements>

Constraint: <any constraints like "backend-only" or "no app rebuild">
Anti-hallucination: verify <specific facts> before coding.
```

---

## Example Prompts

**Feature:**
```
/gsd:quick Add promo code validation to checkout — accept promo_code in CreateOrderRequest, validate against Promotion table, subtract discount from total. Backend-only, no iOS rebuild.
```

**Bug fix:**
```
/gsd:debug Customer sees discount in UI but pays full price — promo_code silently dropped by Pydantic
```

**Deploy:**
```
/gsd:quick Deploy latest backend to staging + production via CI/CD, smoke test all endpoints
```

**Security:**
```
/gsd:quick --full HOTFIX: WebSocket endpoint allows unauthenticated connections — add JWT validation to /ws/{client_id}
```

**Audit/Research:**
```
/gsd:quick Audit all 250 API endpoints for missing auth headers — produce report, no code changes
```
