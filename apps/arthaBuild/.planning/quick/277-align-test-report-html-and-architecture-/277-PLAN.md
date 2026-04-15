---
phase: quick-277
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/arthaBuild/docs/test-report.html
  - apps/arthaBuild/.planning/phases/08-launch-readiness/08-01-PLAN.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "test-report.html shows a Phase 7 section with TC-LIC-01 through TC-LIC-04 as PENDING"
    - "59/59 PASSING tests in prior sections remain unchanged"
    - "Summary stats updated to reflect 4 pending license tests"
    - "08-01-PLAN.md includes a task to update test-report.html after all 86 tests pass"
    - "Both HTML files committed with correct message"
  artifacts:
    - path: "apps/arthaBuild/docs/test-report.html"
      provides: "Phase 7 license test section, PENDING badges for TC-LIC-01..04"
    - path: "apps/arthaBuild/.planning/phases/08-launch-readiness/08-01-PLAN.md"
      provides: "Task to update test-report.html after 86 tests pass"
---

<objective>
Align test-report.html with Phase 7 state and update Phase 8 plan to finalize the HTML after full test suite passes.

Purpose: The HTML test report must accurately reflect project state — Phase 7 license system was verified manually (not yet pytest-covered), so its 4 test cases get a PENDING badge rather than PASS.
Output: Updated test-report.html + one new task in 08-01-PLAN.md + git commit.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/apps/arthaBuild/.planning/STATE.md
@/Users/jeet/doordash-p2p/apps/arthaBuild/docs/REQUIREMENTS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1 — Add Phase 7 license section to test-report.html</name>
  <files>apps/arthaBuild/docs/test-report.html</files>
  <action>
    Read the current file at /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
    (already read above — 195 lines).

    Make the following changes:

    1. Add a `--pending` CSS variable and `.badge-pending` style to the `<style>` block,
       immediately after the `.badge-fail` rule (around line 39):
       ```css
       --pending: #fbbf24;
       ```
       (--warn already exists as #fbbf24, so just add `.badge-pending`):
       ```css
       .badge-pending { background: rgba(251,191,36,.12); color: var(--warn); border: 1px solid rgba(251,191,36,.25); }
       ```

    2. Update the `<title>` tag (line 6) — it already reads "Phase 1–7" which is correct.
       Leave it unchanged.

    3. Update the subtitle (line 47) from:
       ```
       Phase 1–7 &nbsp;·&nbsp; Generated April 2026 &nbsp;·&nbsp; 59/59 passing
       ```
       to:
       ```
       Phase 1–7 &nbsp;·&nbsp; Generated April 2026 &nbsp;·&nbsp; 59/59 passing · 4 license tests pending Phase 8
       ```

    4. Update the summary grid stat (line 53) — the "7 Phases Covered" stat — leave it as-is
       since Phase 7 IS covered (just pending pytest). Leave all 4 stat cards unchanged.

    5. Insert a new Phase 7 section BEFORE the closing `</body>` tag but AFTER the green
       "All 59 Tests Passing" div (after line 186), and BEFORE the `<footer>` tag.

       Replace the existing "All 59 Tests Passing" block (lines 180-186) with an updated version
       that shows 59 passing + 4 pending:

       ```html
       <div style="margin-top: 40px; padding: 20px; background: rgba(74,222,128,.06); border: 1px solid rgba(74,222,128,.2); border-radius: 12px; display: flex; align-items: center; gap: 16px;">
         <span style="font-size: 28px;">✓</span>
         <div>
           <div style="font-weight: 700; color: #4ade80; margin-bottom: 4px;">59/59 Tests Passing · 4 License Tests Pending</div>
           <div style="color: #71717a; font-size: 13px;">Phases 1–6 complete (59 pytest). Phase 7 license system verified manually — TC-LIC-01..04 become pytest in Phase 8.</div>
         </div>
       </div>
       ```

    6. Insert the Phase 7 section BEFORE the summary block above (i.e., between the Phase 6 section
       and the summary green block). Insert after the closing `</div>` of Phase 6 (after line 178):

       ```html
       <!-- Phase 7 License System -->
       <div class="phase-section">
         <div class="phase-header">
           Phase 7 — License System
           <span class="phase-badge">4 tests</span>
         </div>
         <table>
           <thead><tr><th>Test Name</th><th>File</th><th>Status</th></tr></thead>
           <tbody>
             <tr><td class="test-name">TC-LIC-01 — valid license key</td><td>test_license.py (Phase 8)</td><td><span class="badge badge-pending">PENDING</span></td></tr>
             <tr><td class="test-name">TC-LIC-02 — expired license → demo mode</td><td>test_license.py (Phase 8)</td><td><span class="badge badge-pending">PENDING</span></td></tr>
             <tr><td class="test-name">TC-LIC-03 — server unreachable → grace period 72hr</td><td>test_license.py (Phase 8)</td><td><span class="badge badge-pending">PENDING</span></td></tr>
             <tr><td class="test-name">TC-LIC-04 — tampered key → 403 demo mode</td><td>test_license.py (Phase 8)</td><td><span class="badge badge-pending">PENDING</span></td></tr>
           </tbody>
         </table>
       </div>
       ```

    Write the complete updated file to docs/test-report.html.
  </action>
  <verify>
    grep -c "badge-pending" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
    # Must be >= 5 (4 rows + 1 CSS rule)
    grep "TC-LIC-01" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
    grep "TC-LIC-04" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
    grep "59/59 Tests Passing" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
  </verify>
  <done>
    test-report.html shows Phase 7 section with 4 PENDING badges.
    59 existing PASS rows untouched.
    Summary block updated to reflect 4 pending tests.
  </done>
</task>

<task type="auto">
  <name>Task 2 — Add test-report HTML update task to 08-01-PLAN.md</name>
  <files>apps/arthaBuild/.planning/phases/08-launch-readiness/08-01-PLAN.md</files>
  <action>
    Read the current 08-01-PLAN.md (already read — 492 lines).

    Insert a new Task 5.5 BETWEEN Task 5 (TROUBLESHOOTING + CHANGELOG) and Task 6 (human
    security review). This task updates the HTML files once 86 tests pass.

    Find the line:
    ```
    <task type="human">
      <name>Task 6 [HUMAN REVIEW] — Final pre-launch security audit</name>
    ```

    Insert the following block IMMEDIATELY BEFORE it:

    ```xml
    <task type="auto">
      <name>Task 5.5 — Update test-report.html and architecture-diagram.html for final state</name>
      <files>
        docs/test-report.html
        docs/architecture-diagram.html
      </files>
      <action>
        After all 86 tests pass (Task 1 confirmed), update docs/test-report.html:
        1. Change the 4 PENDING TC-LIC-xx rows to PASS badges (badge-pass class).
        2. Update subtitle: "Phase 1–8 · Generated April 2026 · 86/86 passing"
        3. Update "All 59 Tests Passing" summary block: "All 86 Tests Passing", run time ~60s.
        4. Update Total Tests stat from 59 → 86, Passing from 59 → 86.

        Verify architecture-diagram.html still matches ARCHITECTURE.md v1.7 — if Phase 8
        adds any new components or connections, reflect them. Otherwise leave as-is.

        No changes needed to architecture-diagram.html unless Phase 8 adds new architecture
        elements beyond what v1.7 already documents.
      </action>
      <verify>
        grep "86/86 passing" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
        grep "badge-pass.*TC-LIC" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html || \
          grep "TC-LIC-04" /Users/jeet/doordash-p2p/apps/arthaBuild/docs/test-report.html
      </verify>
      <done>
        test-report.html shows 86/86 passing with all 4 TC-LIC rows as PASS.
      </done>
    </task>

    ```

    Also update the `files_modified` frontmatter to include:
      - docs/test-report.html
      - docs/architecture-diagram.html

    Write the complete updated 08-01-PLAN.md.
  </action>
  <verify>
    grep "Task 5.5" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/08-launch-readiness/08-01-PLAN.md
    grep "test-report.html" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/08-launch-readiness/08-01-PLAN.md
  </verify>
  <done>
    08-01-PLAN.md contains Task 5.5 between Task 5 and Task 6.
    files_modified frontmatter includes docs/test-report.html and docs/architecture-diagram.html.
  </done>
</task>

<task type="auto">
  <name>Task 3 — Commit both HTML files</name>
  <files>(git operations only)</files>
  <action>
    Stage and commit the two HTML files:

    ```bash
    cd /Users/jeet/doordash-p2p
    git add apps/arthaBuild/docs/architecture-diagram.html apps/arthaBuild/docs/test-report.html
    git commit -m "docs(arthaBuild/phase7): architecture-diagram.html v1.7 + test-report.html Phase 7 license section"
    ```

    The commit includes:
    - docs/architecture-diagram.html — v1.7 (already aligned, locally modified)
    - docs/test-report.html — Phase 7 license section added with 4 PENDING test cases

    Do NOT include 08-01-PLAN.md in this commit — it will be committed separately as part of
    Phase 8 planning state.

    After committing, run:
    ```bash
    git show --stat HEAD
    ```
    to confirm only the two HTML files are in the commit.
  </action>
  <verify>
    git -C /Users/jeet/doordash-p2p show --stat HEAD | grep "architecture-diagram.html"
    git -C /Users/jeet/doordash-p2p show --stat HEAD | grep "test-report.html"
    git -C /Users/jeet/doordash-p2p show --stat HEAD | grep -v "08-01-PLAN"
  </verify>
  <done>
    git show --stat HEAD lists exactly 2 files: architecture-diagram.html + test-report.html.
    Commit message matches: "docs(arthaBuild/phase7): architecture-diagram.html v1.7 + test-report.html Phase 7 license section"
  </done>
</task>

</tasks>

<verification>
1. grep "TC-LIC-01" apps/arthaBuild/docs/test-report.html → found
2. grep "badge-pending" apps/arthaBuild/docs/test-report.html → at least 5 matches
3. grep "59/59 Tests Passing" apps/arthaBuild/docs/test-report.html → found (59 unchanged)
4. grep "Task 5.5" apps/arthaBuild/.planning/phases/08-launch-readiness/08-01-PLAN.md → found
5. git show --stat HEAD → shows architecture-diagram.html + test-report.html only
</verification>

<success_criteria>
- test-report.html: Phase 7 section visible with TC-LIC-01..04 all showing PENDING badge
- test-report.html: 59 prior PASS rows untouched, subtitle updated with "4 license tests pending Phase 8"
- 08-01-PLAN.md: Task 5.5 inserted between Task 5 and Task 6, covering HTML finalization after 86 tests pass
- Git commit contains architecture-diagram.html + test-report.html with correct message
</success_criteria>

<output>
No SUMMARY.md needed for quick tasks. Return ## PLANNING COMPLETE to orchestrator.
</output>
