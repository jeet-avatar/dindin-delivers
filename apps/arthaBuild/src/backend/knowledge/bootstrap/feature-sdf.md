---
source: Oracle NetSuite Official Documentation — SuiteCloud Development Framework (SDF)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# SuiteCloud Development Framework (SDF)

## Overview

SDF is NetSuite's package-based deployment framework for SuiteCloud objects.
It enables version control, CI/CD pipelines, and repeatable deployments of
customization objects (scripts, workflows, custom records, fields, etc.)
across multiple NetSuite accounts.

**Requirements:** Node.js 18+, SuiteCloud CLI (`npm install -g @oracle/suitecloud-cli`)

---

## Project Structure

```
my-sdf-project/
├── src/
│   └── AccountCustomization/
│       ├── Objects/              ← XML configuration objects
│       │   ├── script/           ← Script + ScriptDeployment XML
│       │   │   ├── customscript_my_ue_script.xml
│       │   │   └── customdeploy_my_ue_script.xml
│       │   ├── workflow/         ← Workflow XML definitions
│       │   │   └── customworkflow_approval_flow.xml
│       │   ├── customrecordtype/ ← Custom record definitions
│       │   └── customfield/      ← Custom field definitions
│       └── FileCabinet/
│           └── SuiteScripts/     ← JS files → /SuiteScripts/ in File Cabinet
│               ├── my_ue_script.js
│               └── lib/
│                   └── helpers.js
├── .suitecloud-project.json      ← Project config
├── manifest.xml                  ← Project metadata
└── deploy.xml                    ← Deployment config
```

---

## Key Files

### .suitecloud-project.json

```json
{
  "defaultAuthId": "my-account-auth",
  "projectName": "My SDF Project",
  "projectVersion": "1.0.0",
  "publisherId": "com.mycompany",
  "projectType": "ACCOUNTCUSTOMIZATION"
}
```

### manifest.xml

```xml
<manifest projecttype="ACCOUNTCUSTOMIZATION">
  <projectname>My SDF Project</projectname>
  <frameworkversion>1.0</frameworkversion>
  <dependencies>
    <accounts>
      <installedforall>true</installedforall>
    </accounts>
  </dependencies>
</manifest>
```

### deploy.xml

```xml
<deploy>
  <configuration>
    <path>~/AccountCustomization</path>
  </configuration>
</deploy>
```

---

## CLI Commands

### Account Setup

```bash
# Configure account credentials (interactive)
suitecloud account:setup -i

# List configured auth IDs
suitecloud account:list

# Authenticate with a specific account
suitecloud account:setup --authid production-account
```

### Project Management

```bash
# Create a new SDF project (interactive)
suitecloud project:create -i

# Validate the project without deploying
suitecloud project:validate

# Deploy to the currently configured account
suitecloud project:deploy

# Deploy to a specific auth ID (for CI/CD)
suitecloud project:deploy --authid production-account --no-preview
```

### Object Management

```bash
# Import objects from a NetSuite account into local project
suitecloud object:import -i

# List objects in the account
suitecloud object:list --type script

# Create a new script file
suitecloud file:create -i
```

---

## Object Types in SDF

| Object Type            | Directory           | Description                                    |
|------------------------|---------------------|------------------------------------------------|
| script                 | Objects/script/     | Script definitions (type, function, module)    |
| scriptdeployment       | Objects/script/     | Script deployment records                      |
| workflow               | Objects/workflow/   | SuiteFlow workflow definitions                 |
| customrecordtype       | Objects/customrecordtype/ | Custom record type definitions          |
| customfield            | Objects/customfield/| Custom field definitions                       |
| savedcsvimport         | Objects/savedcsvimport/ | Saved CSV import mappings                  |
| customlist             | Objects/customlist/ | Custom list definitions                        |
| role                   | Objects/role/       | Role definitions                               |
| layoutbuilderformtype  | Objects/form/       | Custom forms                                   |

---

## Script Object XML Example

```xml
<!-- customscript_approval_ue.xml -->
<script scripttype="userevent" scriptid="customscript_approval_ue">
  <name>Approval User Event</name>
  <scriptfile>/SuiteScripts/approval_ue.js</scriptfile>
  <libraries>
    <library>
      <scriptfile>/SuiteScripts/lib/helpers.js</scriptfile>
    </library>
  </libraries>
  <aftersubmitfunction>afterSubmit</aftersubmitfunction>
</script>
```

```xml
<!-- customdeploy_approval_ue.xml -->
<scriptdeployment scriptid="customdeploy_approval_ue">
  <script>[scriptref="customscript_approval_ue"]</script>
  <recordtype>salesorder</recordtype>
  <status>TESTING</status>
  <deploymentid>customdeploy_approval_ue</deploymentid>
  <runasadmin>false</runasadmin>
</scriptdeployment>
```

---

## CI/CD Pipeline Integration

For non-interactive CI/CD deployments:

```bash
# Set up auth with token (stored securely in CI env vars)
suitecloud account:setup \
  --authid ci-account \
  --accountid "$NETSUITE_ACCOUNT_ID" \
  --tokenid "$NETSUITE_TOKEN_ID" \
  --tokensecret "$NETSUITE_TOKEN_SECRET" \
  --consumerkey "$NETSUITE_CONSUMER_KEY" \
  --consumersecret "$NETSUITE_CONSUMER_SECRET"

# Validate and deploy (non-interactive)
suitecloud project:validate --authid ci-account
suitecloud project:deploy --authid ci-account --no-preview
```

**GitHub Actions example:**

```yaml
- name: Deploy to NetSuite Sandbox
  run: |
    suitecloud account:setup --authid sandbox --accountid ${{ secrets.NS_ACCOUNT_ID }} \
      --tokenid ${{ secrets.NS_TOKEN_ID }} --tokensecret ${{ secrets.NS_TOKEN_SECRET }} \
      --consumerkey ${{ secrets.NS_CONSUMER_KEY }} --consumersecret ${{ secrets.NS_CONSUMER_SECRET }}
    suitecloud project:deploy --authid sandbox --no-preview
```

---

## Sandbox → Production Deployment Flow

1. **Develop and test** in Development Sandbox
2. **Run `suitecloud project:validate`** — catches missing references, syntax errors
3. **Deploy to Release Preview Sandbox** — test against upcoming NetSuite release
4. **Deploy to Production** — using production auth credentials

---

## SDF vs Manual Object Creation

| Aspect              | Manual (UI)             | SDF                                        |
|---------------------|-------------------------|--------------------------------------------|
| Version Control     | None                    | Full Git history                           |
| Repeatability       | Manual re-creation      | Automated, identical across accounts       |
| Rollback            | Manual                  | `git revert` + redeploy                    |
| Code Review         | Not possible            | Pull request workflow                      |
| Environment Parity  | Drift risk              | Guaranteed identical across envs           |
| Object Dependencies | Manually tracked        | XML references verified by SDF             |

---

## Common Issues

| Error                        | Cause                                             | Fix                                                  |
|------------------------------|---------------------------------------------------|------------------------------------------------------|
| `Object not found`           | Referenced object not in project                  | Import missing objects first                         |
| `Customization ID conflict`  | ScriptId already exists in account                | Rename in XML or import existing                     |
| `File not found in cabinet`  | JS file path in XML doesn't match FileCabinet path| Verify `<scriptfile>` path matches folder structure  |
| `Authentication failure`     | Auth credentials expired                          | Run `suitecloud account:setup -i` again              |
