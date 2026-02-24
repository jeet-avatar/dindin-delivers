---
phase: quick-44
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/StudioProjects/eatfair-android/.github/workflows/android-ci.yml
  - /Users/jeet/StudioProjects/eatfair-android/.github/workflows/deploy-firebase.yml
autonomous: false
requirements: [ANDROID-CI-CD]

must_haves:
  truths:
    - "Pushing to main triggers lint, test, build, and Firebase distribution automatically"
    - "Manual workflow_dispatch can build + distribute any or all 3 apps to Firebase on demand"
    - "Release APKs are signed with the production keystore in CI"
    - "No manual gradlew/firebase CLI commands needed for distribution"
  artifacts:
    - path: ".github/workflows/android-ci.yml"
      provides: "CI pipeline with lint, test, build, and auto-distribute on main push"
    - path: ".github/workflows/deploy-firebase.yml"
      provides: "Manual dispatch workflow for on-demand Firebase App Distribution"
  key_links:
    - from: "android-ci.yml release job"
      to: "Firebase App Distribution"
      via: "firebase-action with GCP service account"
    - from: "deploy-firebase.yml"
      to: "Firebase App Distribution"
      via: "firebase-action with GCP service account + signed APKs"
---

<objective>
Set up complete Android CI/CD for all 3 Dollor.ai apps (customer, driver, partner) in the eatfair-android repo so that pushing to main automatically builds signed release APKs and distributes them to Firebase App Distribution, and a manual workflow_dispatch allows on-demand distribution.

Purpose: Eliminate manual `./gradlew assembleRelease` + `firebase appdistribution:distribute` commands. Enforce the CI/CD-only rule from CLAUDE.md.
Output: Two GitHub Actions workflows in the eatfair-android repo.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Working in the ANDROID repo at /Users/jeet/StudioProjects/eatfair-android (NOT the doordash-p2p repo).

Current state:
- Existing `android-ci.yml` has lint, unit-test, build (debug), instrumented-test, and release jobs
- Release job decodes KEYSTORE_BASE64 secret to sign APKs, but falls back to debug if secret missing
- NO Firebase App Distribution step exists anywhere
- GitHub secrets already configured: GOOGLE_SERVICES_APP, GOOGLE_SERVICES_DRIVER, GOOGLE_SERVICES_PARTNER, GCP_SERVICE_ACCOUNT_KEY
- GitHub secrets MISSING: KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD (needed for signed release builds)
- Firebase project: dollorai-production (#65740760476)
- Firebase App IDs: Customer 1:65740760476:android:535885ca28086e6242d459, Driver 1:65740760476:android:7d9bed1ee685434c42d459, Partner 1:65740760476:android:8591cc17fa4f8d4c42d459
- Signing keystore: dollor-release.jks in repo root (gitignored but file exists locally)
- Signing config reads from local.properties: RELEASE_KEYSTORE_PATH, RELEASE_KEYSTORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD
- Existing build.gradle.kts files already handle CI signing: if keystorePath is empty, signingConfig is not set (release builds will be unsigned)
- For CI, the release job writes keystore from KEYSTORE_BASE64 secret to `dollor-release.jks`, and Gradle reads it via env vars injected into local.properties or via the existing pattern
- Modules: :app (customer), :driver, :partner, :shared
- Remote: https://github.com/jeet-avatar/eatfair-android.git
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update android-ci.yml to add Firebase App Distribution + fix signing secrets</name>
  <files>/Users/jeet/StudioProjects/eatfair-android/.github/workflows/android-ci.yml</files>
  <action>
Update the existing android-ci.yml to:

1. **Fix release signing for CI**: The existing release job already decodes KEYSTORE_BASE64 and runs assembleRelease. Update it to also write a `local.properties` file with the keystore path and passwords so the Gradle signing config picks them up. The build.gradle.kts files read from `local.properties` -- the CI must create this file with:
   ```
   RELEASE_KEYSTORE_PATH=../dollor-release.jks
   RELEASE_KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD
   RELEASE_KEY_ALIAS=$KEY_ALIAS
   RELEASE_KEY_PASSWORD=$KEY_PASSWORD
   ```
   The keystore is decoded from KEYSTORE_BASE64 to `dollor-release.jks` in the repo root.

2. **Add Firebase App Distribution job**: After the `release` job, add a `distribute` job that:
   - `needs: [release]` and `if: github.ref == 'refs/heads/main'` (only distribute on main push, not PRs)
   - Downloads the release-apks artifact from the release job
   - Uses `wzieba/Firebase-Distribution-Github-Action@v1` (or the official `firebase-action`) for each of the 3 APKs:
     - Customer APK: `app/build/outputs/apk/release/app-release.apk`, appId `1:65740760476:android:535885ca28086e6242d459`
     - Driver APK: `driver/build/outputs/apk/release/driver-release.apk`, appId `1:65740760476:android:7d9bed1ee685434c42d459`
     - Partner APK: `partner/build/outputs/apk/release/partner-release.apk`, appId `1:65740760476:android:8591cc17fa4f8d4c42d459`
   - Uses `GCP_SERVICE_ACCOUNT_KEY` secret (already configured) for Firebase auth via `serviceCredentialsFileContent`
   - Sets release notes to: `"CI Build #${{ github.run_number }} - ${{ github.sha }}"`
   - Groups: `qa-testers`

3. **Ensure the release job uploads APKs with correct paths**: The current release job uploads `app/build/outputs/apk/**/*.apk` etc. Keep this pattern but also ensure the distribute job can find release APKs. Adjust upload path patterns to be specific: `*/build/outputs/apk/release/*.apk`.

4. **Keep all existing jobs intact** (lint, unit-test, build, instrumented-test). Only modify the `release` job (add local.properties creation) and add the new `distribute` job.

Use `wzieba/Firebase-Distribution-Github-Action@v1` action -- it is the most widely used community action for Firebase App Distribution and accepts `serviceCredentialsFileContent` directly (no file creation needed). This avoids needing to install firebase-tools CLI in the workflow.
  </action>
  <verify>
Validate the YAML is syntactically correct: `python3 -c "import yaml; yaml.safe_load(open('/Users/jeet/StudioProjects/eatfair-android/.github/workflows/android-ci.yml'))" && echo "YAML OK"`

Verify the workflow has all expected jobs: lint, unit-test, build, instrumented-test, release, distribute.
  </verify>
  <done>android-ci.yml has a `distribute` job that runs after `release` on main branch, distributing all 3 signed APKs to Firebase App Distribution using the GCP service account secret.</done>
</task>

<task type="auto">
  <name>Task 2: Create deploy-firebase.yml for manual on-demand distribution</name>
  <files>/Users/jeet/StudioProjects/eatfair-android/.github/workflows/deploy-firebase.yml</files>
  <action>
Create a new workflow file `deploy-firebase.yml` that allows manual on-demand builds + distribution via `workflow_dispatch`. This is the Android equivalent of the backend's `deploy-staging.yml` -- the workflow operators use instead of running `./gradlew assembleRelease` + `firebase appdistribution:distribute` manually.

The workflow should:

1. **Trigger**: `workflow_dispatch` only, with inputs:
   - `apps`: choice of `all`, `customer`, `driver`, `partner` (default: `all`)
   - `release_notes`: string input for release notes (default: `"Manual deployment"`)

2. **Single job** `build-and-distribute`:
   - `runs-on: ubuntu-latest`
   - Checkout, setup JDK 17 (temurin), cache gradle
   - Create google-services.json files from secrets (same pattern as android-ci.yml)
   - Create `local.properties` with keystore config from secrets (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)
   - Decode keystore: `echo "$KEYSTORE_BASE64" | base64 -d > dollor-release.jks`
   - Run unit tests: `./gradlew :app:testDebugUnitTest :driver:testDebugUnitTest :partner:testDebugUnitTest`
   - Build release APKs based on `apps` input:
     - `all`: `./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease`
     - `customer`: `./gradlew :app:assembleRelease`
     - `driver`: `./gradlew :driver:assembleRelease`
     - `partner`: `./gradlew :partner:assembleRelease`
   - Distribute to Firebase App Distribution using `wzieba/Firebase-Distribution-Github-Action@v1`:
     - Conditional steps for each app (run if `apps == 'all'` OR `apps == '{that_app}'`)
     - Same appIds and serviceCredentialsFileContent pattern as Task 1
     - Release notes from the `release_notes` input + run number
     - Groups: `qa-testers`
   - Upload APKs as artifacts for download

3. **Environment variables**: Same JAVA_VERSION/JAVA_DISTRIBUTION pattern as android-ci.yml.

4. **Summary step** at the end: Print which apps were built and distributed.
  </action>
  <verify>
Validate YAML: `python3 -c "import yaml; yaml.safe_load(open('/Users/jeet/StudioProjects/eatfair-android/.github/workflows/deploy-firebase.yml'))" && echo "YAML OK"`

Verify the file has workflow_dispatch trigger with `apps` and `release_notes` inputs.
  </verify>
  <done>deploy-firebase.yml exists with workflow_dispatch trigger, allowing manual build + distribute of any or all 3 apps to Firebase App Distribution. Replaces manual `./gradlew` + `firebase` CLI commands.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 3: Configure missing GitHub secrets for release signing</name>
  <what-built>Two workflow files ready for CI/CD (android-ci.yml updated + deploy-firebase.yml created). But 4 GitHub secrets are still needed for signed release builds.</what-built>
  <how-to-verify>
The workflows need these 4 secrets configured in the eatfair-android repo (https://github.com/jeet-avatar/eatfair-android/settings/secrets/actions):

1. **KEYSTORE_BASE64**: Base64-encoded keystore file. Generate locally with:
   ```bash
   base64 -i /Users/jeet/StudioProjects/eatfair-android/dollor-release.jks | pbcopy
   ```
   Then paste as the secret value.

2. **KEYSTORE_PASSWORD**: The value of RELEASE_KEYSTORE_PASSWORD from local.properties

3. **KEY_ALIAS**: The value of RELEASE_KEY_ALIAS from local.properties

4. **KEY_PASSWORD**: The value of RELEASE_KEY_PASSWORD from local.properties

After adding secrets, test by triggering the deploy workflow:
```bash
cd /Users/jeet/StudioProjects/eatfair-android
git add .github/workflows/ && git commit -m "ci: add Firebase App Distribution to Android CI/CD"
git push origin main
gh workflow run deploy-firebase.yml -f apps=customer -f release_notes="Test CI/CD setup"
gh run list --workflow=deploy-firebase.yml --limit 3
```

Monitor the run to confirm:
- Unit tests pass
- Release APK is signed (not debug fallback)
- Firebase App Distribution upload succeeds
- APK appears in Firebase console under App Distribution
  </how-to-verify>
  <resume-signal>Type "secrets configured" after adding all 4 secrets and verifying at least one successful workflow run.</resume-signal>
</task>

</tasks>

<verification>
After all tasks complete:
1. `android-ci.yml` has lint -> unit-test -> build -> release -> distribute pipeline
2. `deploy-firebase.yml` provides on-demand distribution via `gh workflow run deploy-firebase.yml`
3. Pushing to main automatically distributes signed APKs to Firebase
4. No manual `./gradlew assembleRelease` or `firebase appdistribution:distribute` needed
5. All 3 apps (customer, driver, partner) are distributed with correct Firebase App IDs
</verification>

<success_criteria>
- Pushing code to main in eatfair-android triggers automatic build + Firebase distribution
- `gh workflow run deploy-firebase.yml -f apps=all` builds and distributes all 3 apps
- Release APKs are signed with production keystore (not debug fallback)
- APKs appear in Firebase App Distribution console after workflow completes
- Zero manual build/distribute commands required
</success_criteria>

<output>
After completion, create `.planning/quick/44-set-up-android-ci-cd-for-all-3-apps-via-/44-SUMMARY.md`
</output>
