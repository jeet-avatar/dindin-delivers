---
phase: quick-9
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: [CLAUDE.md]
autonomous: true
requirements: []

must_haves:
  truths:
    - "CLAUDE.md enforces that all work (code, deploys, fixes) must use GSD phases"
    - "Deploy rule is documented: deploys MUST be tasks inside GSD phase plans"
    - "Commit is recorded in git history with descriptive message"
  artifacts:
    - path: "CLAUDE.md"
      provides: "Project workflow rules enforcing GSD-only work"
      contains: "⚠️ ALL work goes through GSD — NO exceptions"
  key_links:
    - from: "CLAUDE.md"
      to: "git commit"
      via: "git log"
      pattern: "docs: enforce"
---

<objective>
Commit CLAUDE.md update that enforces all work (including deployments) must be executed as tasks inside GSD phase plans, not ad-hoc.

Purpose: Codify the workflow rule that every deploy must be a planned, tracked task in a GSD phase to maintain state integrity and auditability.
Output: Committed CLAUDE.md with enforced GSD-only deploy rule
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

The CLAUDE.md file has already been edited with the new section "⚠️ ALL work goes through GSD — NO exceptions" at lines 257-296. This plan commits the change.
</context>

<tasks>

<task type="auto">
  <name>Commit CLAUDE.md GSD deploy enforcement rule</name>
  <files>CLAUDE.md</files>
  <action>
Use git to commit the CLAUDE.md update that adds the "⚠️ ALL work goes through GSD — NO exceptions" section (lines 257-296). This section establishes that:
- Every task — trivial or complex, code or deploy — MUST use a GSD command
- Quick tasks use `/gsd:quick`
- Bugs use `/gsd:debug`
- Non-trivial work uses full pipeline with `/gsd:research-phase`, `/gsd:discuss-phase`, `/gsd:plan-phase`, `/gsd:execute-phase`
- **Deploy rule: Deploys MUST be a task inside a GSD phase plan (Wave final), never ad-hoc**
- No manual `docker build`, `aws ecs`, `docker push`, or direct ECR/ECS commands

Commit message: "docs: enforce all work (including deploys) must use GSD phases — no standalone deploy shortcuts"

Verify the commit completes successfully before marking done.
  </action>
  <verify>
Run `git log --oneline -1` to confirm the commit is on main with message containing "enforce all work" or "GSD phases"
Run `git show --name-only HEAD` to confirm CLAUDE.md is in the committed files
  </verify>
  <done>CLAUDE.md committed to main with deploy enforcement rule codified. Commit present in git log. No uncommitted changes remain.</done>
</task>

</tasks>

<verification>
After task completion:
- Commit exists in git log with "GSD phases" or "enforce" in message
- CLAUDE.md shows updated Last Updated date
- No unstaged changes remain (`git status` clean)
</verification>

<success_criteria>
- CLAUDE.md committed to main
- Commit message reflects deploy enforcement rule
- git log shows the new commit as HEAD
- Working directory clean
</success_criteria>

<output>
After completion, update:
- `.planning/STATE.md` → Increment "Last activity" to 2026-02-20, note "Quick-9: CLAUDE.md deployed enforcement committed"
</output>
