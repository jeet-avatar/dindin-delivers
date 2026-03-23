---
phase: quick
plan: 219
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/signup.html
autonomous: true
requirements: [Q-219]

must_haves:
  truths:
    - "Requirements checklist appears immediately when password field is focused (before typing)"
    - "Each requirement shows a green checkmark as it is met in real-time"
    - "Unmet requirements show a clearly visible red/grey indicator"
    - "On submit with bad password, the checklist stays visible and the submit error does not obscure what's wrong"
    - "Checklist never collapses back to hidden once shown"
  artifacts:
    - path: "/Users/jeet/Downloads/offerletter-ai/signup.html"
      provides: "Updated password section with focus-triggered checklist and improved submit error"
      contains: "addEventListener.*focus"
  key_links:
    - from: "password input focus event"
      to: "renderPasswordStrength()"
      via: "addEventListener focus"
      pattern: "focus.*renderPasswordStrength|renderPasswordStrength.*focus"
---

<objective>
Fix the offerletter.ai signup page so password requirements are immediately visible and never ambiguous. The existing `renderPasswordStrength()` function in auth.js already renders a per-requirement checklist — it just needs to be shown on focus (not only on input), and the submit-time error message needs to point users to the checklist rather than listing requirements as raw text.

Purpose: Users like Rajesh could not sign up because they had no idea which requirement was failing. The fix is almost entirely in signup.html — auth.js already has the right data model.
Output: Updated signup.html deployed to S3 + CloudFront.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Downloads/offerletter-ai/signup.html
@/Users/jeet/Downloads/offerletter-ai/auth.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Show password checklist on focus and fix submit-time error message</name>
  <files>/Users/jeet/Downloads/offerletter-ai/signup.html</files>
  <action>
Make two targeted changes to signup.html:

**Change 1 — Show checklist on password field focus (before typing):**

In the inline `<script>` block, find the existing `input` event listener on `passwordInput` (around line 160):
```js
passwordInput.addEventListener('input', () => {
  renderPasswordStrength('pwStrength', passwordInput.value);
});
```

Add a `focus` listener immediately after it that triggers the same render with empty string if no value yet, and also sets a flag so the container is never hidden again:
```js
passwordInput.addEventListener('focus', () => {
  if (!passwordInput.value) {
    renderPasswordStrength('pwStrength', '');
  }
});
```

`renderPasswordStrength('pwStrength', '')` with an empty string will render all 5 requirements as unmet (grey circles) — this is the correct "show upfront" state because the existing function handles empty strings correctly (all 5 rules fail = all 5 grey).

**Change 2 — Replace the cryptic submit-time password error:**

Find the submit handler line (around line 197):
```js
if (!pwCheck.valid) { showError('Password requirements: ' + pwCheck.errors.join(', ')); return; }
```

Replace with a message that points to the checklist without duplicating the list in the alert:
```js
if (!pwCheck.valid) {
  showError('Password does not meet all requirements — see the checklist below the password field.');
  document.getElementById('pwStrength').scrollIntoView({ behavior: 'smooth', block: 'center' });
  return;
}
```

**Change 3 — Remove the `min-height: 80px` placeholder that creates dead space before focus:**

Find in `<style>`:
```css
#pwStrength { min-height: 80px; }
```

Remove this rule entirely. The checklist is now shown on focus so the reserved dead space is no longer needed. The container will naturally expand when rendered.

No changes to auth.js. No changes to any other file.
  </action>
  <verify>
Open /Users/jeet/Downloads/offerletter-ai/signup.html in a browser (file:// or local server).
1. Click the password field without typing anything — the 5 requirements checklist should appear immediately (all grey/unmet).
2. Type "Hello" — uppercase + lowercase go green, others stay grey.
3. Type "Hello1!" — all 5 go green, strength bar shows "Strong password".
4. Clear the field — checklist stays visible (does not disappear).
5. Click "Create account" with an invalid password — alert says "does not meet all requirements — see the checklist below" and page scrolls to checklist.
  </verify>
  <done>
Password field shows requirements checklist on focus with all 5 rules listed. Requirements turn green in real-time as typed. Checklist never collapses. Submit error message directs user to the checklist instead of listing raw requirement text.
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy updated signup.html to S3 + CloudFront</name>
  <files>/Users/jeet/Downloads/offerletter-ai/signup.html</files>
  <action>
Deploy only the changed file to the offerletter.ai S3 bucket and invalidate the CloudFront path.

First, identify the correct S3 bucket and CloudFront distribution for offerletter.ai:
```bash
aws s3 ls | grep -i offerletter
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,Domain:DomainName,Origins:Origins.Items[0].DomainName}" --output table
```

Then upload and invalidate:
```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/signup.html s3://{BUCKET_NAME}/signup.html \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id {DISTRIBUTION_ID} \
  --paths "/signup.html"
```

Wait for invalidation to complete:
```bash
aws cloudfront wait invalidation-completed \
  --distribution-id {DISTRIBUTION_ID} \
  --id {INVALIDATION_ID}
```

Verify the live page:
```bash
curl -s "https://www.offerletter.ai/signup.html" | grep -c "addEventListener.*focus\|focus.*renderPasswordStrength"
```
  </action>
  <verify>
1. `aws cloudfront wait invalidation-completed` exits 0.
2. `curl -s https://www.offerletter.ai/signup.html | grep "focus"` returns a match showing the new focus listener is live.
3. Visit https://www.offerletter.ai/signup.html in browser, click password field — checklist appears immediately.
  </verify>
  <done>
Live signup page shows password requirements checklist on focus. CloudFront cache invalidated. No regression on any other form functionality.
  </done>
</task>

</tasks>

<verification>
- [ ] Grep proof: `grep -n "addEventListener.*focus\|focus.*renderPasswordStrength" /Users/jeet/Downloads/offerletter-ai/signup.html` returns a match
- [ ] Grep proof: `grep -n "min-height: 80px" /Users/jeet/Downloads/offerletter-ai/signup.html` returns nothing (rule removed)
- [ ] Grep proof: `grep -n "see the checklist" /Users/jeet/Downloads/offerletter-ai/signup.html` returns a match (new error message)
- [ ] Live URL: `curl -s https://www.offerletter.ai/signup.html | grep "focus"` confirms deployment
- [ ] Manual: Focus password field on live page → checklist appears immediately
</verification>

<success_criteria>
A user landing on the signup page can immediately see what password rules exist by clicking the password field. Each rule lights up green as it is satisfied. If they try to submit a bad password, the error message tells them exactly where to look. No user should be stuck unable to sign up due to password opacity.
</success_criteria>

<output>
After completion, create `.planning/quick/219-show-password-requirements-clearly-on-of/219-SUMMARY.md` with:
- Files changed
- Exact lines modified in signup.html
- CloudFront invalidation ID and confirmation
- Live URL verification output
</output>
