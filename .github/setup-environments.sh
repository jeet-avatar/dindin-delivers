#!/bin/bash
# ============================================
# GitHub Environments Setup Script
# Run this script to configure GitHub environments
# for the repository
# ============================================

set -e

# Configuration
OWNER="your-org"  # Replace with your GitHub org/user
REPO="eatfair-ios"  # Replace with your repo name

echo "Setting up GitHub environments for $OWNER/$REPO"
echo "================================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first."
    echo "  brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub CLI first:"
    echo "  gh auth login"
    exit 1
fi

# ============================================
# Create Development Environment
# ============================================
echo ""
echo "Creating Development environment..."

gh api repos/$OWNER/$REPO/environments/development \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f wait_timer=0 \
  -f prevent_self_review=false \
  --silent && echo "  ✓ Development environment created"

# ============================================
# Create Staging Environment
# ============================================
echo ""
echo "Creating Staging environment..."

gh api repos/$OWNER/$REPO/environments/staging \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f wait_timer=300 \
  -f prevent_self_review=true \
  --silent && echo "  ✓ Staging environment created"

# Note: Reviewers need to be added via UI or additional API calls

# ============================================
# Create Production Environment
# ============================================
echo ""
echo "Creating Production environment..."

gh api repos/$OWNER/$REPO/environments/production \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f wait_timer=600 \
  -f prevent_self_review=true \
  --silent && echo "  ✓ Production environment created"

# ============================================
# Set up Branch Protection Rules
# ============================================
echo ""
echo "Setting up branch protection rules..."

# Main branch
echo "  Setting up 'main' branch protection..."
gh api repos/$OWNER/$REPO/branches/main/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF && echo "    ✓ main branch protected"
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Lint & Format",
      "Semgrep SAST",
      "Tests & Coverage",
      "SonarCloud Analysis",
      "Quality Gate",
      "Build & Scan Image"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Staging branch
echo "  Setting up 'staging' branch protection..."
gh api repos/$OWNER/$REPO/branches/staging/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF && echo "    ✓ staging branch protected"
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Lint & Format",
      "Semgrep SAST",
      "Tests & Coverage",
      "Quality Gate"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Develop branch
echo "  Setting up 'develop' branch protection..."
gh api repos/$OWNER/$REPO/branches/develop/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF && echo "    ✓ develop branch protected"
{
  "required_status_checks": {
    "strict": false,
    "contexts": [
      "Lint & Format",
      "Semgrep SAST",
      "Tests & Coverage"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# ============================================
# Summary
# ============================================
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Environments created:"
echo "  - development (auto-deploy)"
echo "  - staging (5 min wait, requires review)"
echo "  - production (10 min wait, requires 2 reviews)"
echo ""
echo "Branch protection enabled for:"
echo "  - main (2 approvals, all checks required)"
echo "  - staging (1 approval, quality checks)"
echo "  - develop (1 approval, basic checks)"
echo ""
echo "Next steps:"
echo "  1. Add environment reviewers in GitHub UI"
echo "  2. Configure environment secrets"
echo "  3. Set up Slack/Teams notifications"
echo ""
echo "Go to: https://github.com/$OWNER/$REPO/settings/environments"
