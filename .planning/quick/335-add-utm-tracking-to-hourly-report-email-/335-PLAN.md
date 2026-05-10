---
phase: quick-335
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - aws/lambda/marquee-hourly-report/lambda_function.py
autonomous: true
requirements: [QUICK-335]
must_haves:
  truths:
    - "Every demo site page entry in the email is a clickable <a href> with ?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo appended"
    - "Footer domain names are also clickable with the same UTM params"
    - "Lambda deploys successfully and email structure is unchanged except for the link additions"
  artifacts:
    - path: "aws/lambda/marquee-hourly-report/lambda_function.py"
      provides: "Updated handler with UTM-tagged links"
      contains: "utm_source=hourly-report"
  key_links:
    - from: "email body row td"
      to: "demo site URL"
      via: "<a href='https://{site+path}?utm_source=...'> anchor"
      pattern: "utm_source=hourly-report"
---

<objective>
Add UTM tracking parameters to every demo site link in the marquee-hourly-report Lambda email body.

Purpose: When recipients forward the email and a third party clicks a link, the visitor path in CloudWatch logs will include `?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo`, making forwarded clicks distinguishable from organic visits.

Output: Updated `lambda_function.py` re-zipped and uploaded to the `marquee-hourly-report` Lambda.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/334-universal-zietra-demo-monitoring-fix-iam/334-SUMMARY.md

Current handler is at /tmp/hourly-report-extract/lambda_function.py (already extracted).

Key observations from the current handler:
- Line 56: `site + path` produces plain text like `marquee.zietra.com/some-path` inside a <td> — NOT a hyperlink
- Line 77: The `{p['page']}` value is rendered as plain text in the table cell
- Line 95: Footer has bare domain names as plain text (not hyperlinks)
- GROUPS dict maps log group → base domain (no https:// prefix)

UTM params to append: `?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Edit handler.py — add UTM-tagged hyperlinks to page entries and footer</name>
  <files>/tmp/hourly-report-extract/lambda_function.py</files>
  <action>
Edit /tmp/hourly-report-extract/lambda_function.py with these two targeted changes:

**Change 1 — line 77 (page entry td):**
Replace the plain-text `{p['page']}` with a clickable anchor containing the full UTM-tagged URL.

Current (line 77):
```python
f"<td style='padding:5px 10px;font-size:12px;font-family:monospace'>{p['page']}</td></tr>"
```

New:
```python
f"<td style='padding:5px 10px;font-size:12px;font-family:monospace'>"
f"<a href='https://{p['page']}?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' "
f"style='color:#3b82f6;text-decoration:none'>{p['page']}</a></td></tr>"
```

Note: `p['page']` is already `site + path` (e.g., `marquee.zietra.com/salesperson/1`), so prepending `https://` makes a valid URL.

**Change 2 — line 95 (footer):**
Replace the plain-text domain list with anchor-tagged domains.

Current (line 95):
```python
marquee.zietra.com &nbsp;·&nbsp; asc606.zietra.com &nbsp;·&nbsp; turionspace.zietra.com &nbsp;·&nbsp; auto-report every hour
```

New (keep existing style attributes on the footer div unchanged, only change the text content):
```python
<a href='https://marquee.zietra.com?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' style='color:#94a3b8'>marquee.zietra.com</a> &nbsp;·&nbsp; <a href='https://asc606.zietra.com?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' style='color:#94a3b8'>asc606.zietra.com</a> &nbsp;·&nbsp; <a href='https://turionspace.zietra.com?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo' style='color:#94a3b8'>turionspace.zietra.com</a> &nbsp;·&nbsp; auto-report every hour
```

No other changes. Do NOT alter GROUPS dict, geo(), SMTP logic, subject line, or any other part of the handler.

After editing, verify the file contains `utm_source=hourly-report` before proceeding.
  </action>
  <verify>grep -c "utm_source=hourly-report" /tmp/hourly-report-extract/lambda_function.py</verify>
  <done>Returns 5 (3 footer anchors + 1 in the page-entry anchor + grep may count lines, expect ≥4 matches total — one per link occurrence). Confirm no syntax errors: python3 -c "import ast; ast.parse(open('/tmp/hourly-report-extract/lambda_function.py').read()); print('syntax OK')"</done>
</task>

<task type="auto">
  <name>Task 2: Rezip and deploy updated handler to marquee-hourly-report Lambda</name>
  <files>aws/lambda/marquee-hourly-report (live AWS resource)</files>
  <action>
From /tmp/hourly-report-extract:

```bash
cd /tmp/hourly-report-extract
zip lambda-updated.zip lambda_function.py
aws lambda update-function-code \
  --function-name marquee-hourly-report \
  --zip-file fileb://lambda-updated.zip \
  --region us-east-1
```

Wait for update to complete, then invoke to confirm no runtime errors:

```bash
aws lambda invoke \
  --function-name marquee-hourly-report \
  --region us-east-1 \
  --payload '{}' \
  /tmp/hourly-report-response.json \
  --log-type Tail \
  --query 'LogResult' \
  --output text | base64 -d
```

Check /tmp/hourly-report-response.json — should return `{"visitors": N}` (not an error).

Then commit the updated handler into the planning docs for audit trail:

```bash
mkdir -p /Users/jeet/doordash-p2p/aws/lambda/marquee-hourly-report
cp /tmp/hourly-report-extract/lambda_function.py /Users/jeet/doordash-p2p/aws/lambda/marquee-hourly-report/lambda_function.py
cd /Users/jeet/doordash-p2p
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add aws/lambda/marquee-hourly-report/lambda_function.py
git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "feat(quick-335): add UTM tracking to hourly-report email links"
```
  </action>
  <verify>
1. aws lambda get-function-configuration --function-name marquee-hourly-report --region us-east-1 --query 'LastModified'
2. cat /tmp/hourly-report-response.json — must contain "visitors" key, not "errorMessage"
3. grep "utm_source=hourly-report" /Users/jeet/doordash-p2p/aws/lambda/marquee-hourly-report/lambda_function.py
  </verify>
  <done>Lambda LastModified timestamp is within last 5 minutes, response has "visitors" key (no errorMessage), and committed file contains utm_source=hourly-report.</done>
</task>

</tasks>

<verification>
After both tasks:
- python3 syntax check passes on the edited handler
- grep confirms ≥4 occurrences of utm_source=hourly-report in the handler
- Lambda invoke returns {"visitors": N} with no errorMessage
- git log shows the commit for quick-335
</verification>

<success_criteria>
- All demo site page entries in the email body render as `<a href='https://site/path?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo'>` anchors
- All three footer domain names are clickable with the same UTM params
- Lambda deploy succeeds (no AccessDeniedException, no syntax errors)
- When a forwarded recipient clicks a link, the Zietra tracker or Lambda logs will show paths ending in `?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo`
</success_criteria>

<output>
After completion, create `.planning/quick/335-add-utm-tracking-to-hourly-report-email-/335-SUMMARY.md`
</output>
