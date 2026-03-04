---
phase: quick-81
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [SUBMIT-01]

must_haves:
  truths:
    - "iOS Customer app build 1111 is submitted for App Store review"
    - "Version state transitions from PREPARE_FOR_SUBMISSION to WAITING_FOR_REVIEW"
  artifacts: []
  key_links:
    - from: "ASC JWT token"
      to: "App Store Connect API"
      via: "Bearer auth header"
      pattern: "Authorization: Bearer"
---

<objective>
Submit iOS Customer app build 1111 to App Store for review via App Store Connect API.

Purpose: Build 1111 passed all 39/39 stress test checks (quick-80). User has approved submission. This is the final step to get the Customer app into App Store review.
Output: App Store version state changed to WAITING_FOR_REVIEW.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
Key facts:
- App Store Connect API Key ID: 9K626GB728
- Issuer ID: 80d10e49-f379-462f-9668-5ea53016812e
- Private key path: ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8
- App ID: 6758230264
- Version ID: 30ad500d-cdf6-47fb-98e2-314fe6fd68dc
- Build: 1111
- User has explicitly approved this submission
</context>

<tasks>

<task type="auto">
  <name>Task 1: Generate ASC JWT and verify version is ready for submission</name>
  <files></files>
  <action>
Generate an App Store Connect JWT token using python3 inline (PyJWT). The token must use:
- Algorithm: ES256
- Key ID (kid): 9K626GB728
- Issuer (iss): 80d10e49-f379-462f-9668-5ea53016812e
- Audience (aud): appstoreconnect-v1
- Expiry: 20 minutes from now
- Private key from: ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8

Then use curl with that JWT to:
1. GET https://api.appstoreconnect.apple.com/v1/appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc — confirm `appStoreState` is `PREPARE_FOR_SUBMISSION`
2. GET the same URL with `?include=build` — confirm build 1111 is attached (check `attributes.version` in included build data)

If PyJWT is not installed, install it: `pip3 install PyJWT`. Also ensure `cryptography` is installed for ES256 support.

Use this python3 one-liner pattern to generate the token:
```
python3 -c "
import jwt, time
key = open('$HOME/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8').read()
token = jwt.encode(
    {'iss': '80d10e49-f379-462f-9668-5ea53016812e', 'iat': int(time.time()), 'exp': int(time.time()) + 1200, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': '9K626GB728'}
)
print(token)
"
```
  </action>
  <verify>curl GET to version endpoint returns 200 with appStoreState=PREPARE_FOR_SUBMISSION and build 1111 attached</verify>
  <done>JWT generated successfully, version confirmed in PREPARE_FOR_SUBMISSION state with build 1111 attached</done>
</task>

<task type="auto">
  <name>Task 2: Submit for App Store review and confirm state change</name>
  <files></files>
  <action>
Using the JWT from Task 1, submit the app for review:

```bash
curl -X POST "https://api.appstoreconnect.apple.com/v1/appStoreVersionSubmissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"appStoreVersionSubmissions","relationships":{"appStoreVersion":{"data":{"type":"appStoreVersions","id":"30ad500d-cdf6-47fb-98e2-314fe6fd68dc"}}}}}'
```

Expected: 201 Created response.

If the POST returns an error about the submission API being deprecated, use the newer submission endpoint instead:
```bash
curl -X POST "https://api.appstoreconnect.apple.com/v1/appStoreReviewDetails" \
```
Or check if `appStoreVersionSubmissions` is still valid first.

After successful submission, verify the state changed:
```bash
curl -s "https://api.appstoreconnect.apple.com/v1/appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Confirm `appStoreState` is now `WAITING_FOR_REVIEW` (or `IN_REVIEW` if Apple processes quickly).

Report final confirmation with:
- Version state
- Submission timestamp
- Expected review timeline (typically 24-48 hours)
  </action>
  <verify>GET version endpoint returns appStoreState of WAITING_FOR_REVIEW or IN_REVIEW</verify>
  <done>App Store version 1.0 build 1111 submitted for review, state confirmed as WAITING_FOR_REVIEW</done>
</task>

</tasks>

<verification>
- Version state is WAITING_FOR_REVIEW or IN_REVIEW (not PREPARE_FOR_SUBMISSION)
- No error responses from ASC API
</verification>

<success_criteria>
iOS Customer app build 1111 is in App Store review queue. Version state confirmed via API.
</success_criteria>

<output>
After completion, create `.planning/quick/81-submit-ios-customer-app-build-1111-to-ap/81-SUMMARY.md`
</output>
