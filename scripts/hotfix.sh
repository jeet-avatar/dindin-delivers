#!/bin/bash
# Dollor.ai Hotfix Workflow Script
# =================================
# Usage: ./scripts/hotfix.sh [command] [args]
#
# Commands:
#   create <name>    Create a new hotfix branch
#   finish <name>    Finish and create PR for hotfix
#   sync             Sync hotfix worktree with main
#   list             List active hotfix branches
#   status           Show hotfix worktree status

set -e

# Configuration
MAIN_REPO="/Users/jeet/StudioProjects/eatfair-ios"
HOTFIX_REPO="/Users/jeet/StudioProjects/eatfair-ios-hotfix"
BASE_BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Ensure hotfix worktree exists
ensure_worktree() {
    if [ ! -d "$HOTFIX_REPO" ]; then
        print_info "Creating hotfix worktree..."
        cd "$MAIN_REPO"
        git worktree add "$HOTFIX_REPO" -b hotfix/base origin/main
        print_success "Hotfix worktree created at $HOTFIX_REPO"
    fi
}

# Create a new hotfix branch
create_hotfix() {
    local name="$1"
    if [ -z "$name" ]; then
        print_error "Usage: hotfix.sh create <hotfix-name>"
        exit 1
    fi

    ensure_worktree
    cd "$HOTFIX_REPO"

    # Sync with main first
    print_info "Syncing with main branch..."
    git fetch origin
    git checkout hotfix/base
    git reset --hard origin/main

    # Create hotfix branch
    local branch_name="hotfix/$name"
    print_info "Creating branch: $branch_name"
    git checkout -b "$branch_name"

    print_success "Hotfix branch created: $branch_name"
    print_info "Working directory: $HOTFIX_REPO"
    echo ""
    echo "Next steps:"
    echo "  1. cd $HOTFIX_REPO"
    echo "  2. Make your changes"
    echo "  3. git add . && git commit -m 'fix: Your hotfix message'"
    echo "  4. ./scripts/hotfix.sh finish $name"
}

# Finish hotfix and create PR
finish_hotfix() {
    local name="$1"
    if [ -z "$name" ]; then
        # Try to get current branch name
        cd "$HOTFIX_REPO"
        local current_branch=$(git branch --show-current)
        if [[ "$current_branch" == hotfix/* ]]; then
            name="${current_branch#hotfix/}"
        else
            print_error "Usage: hotfix.sh finish <hotfix-name>"
            exit 1
        fi
    fi

    cd "$HOTFIX_REPO"
    local branch_name="hotfix/$name"

    # Check if we're on the right branch
    local current=$(git branch --show-current)
    if [ "$current" != "$branch_name" ]; then
        print_info "Switching to $branch_name..."
        git checkout "$branch_name"
    fi

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_error "You have uncommitted changes. Please commit or stash them first."
        git status --short
        exit 1
    fi

    # Push the branch
    print_info "Pushing $branch_name to origin..."
    git push -u origin "$branch_name"

    # Create PR using gh CLI
    print_info "Creating Pull Request..."
    gh pr create \
        --base "$BASE_BRANCH" \
        --title "Hotfix: $name" \
        --body "$(cat <<EOF
## Hotfix: $name

### Summary
<!-- Describe what this hotfix addresses -->

### Root Cause
<!-- What caused the issue -->

### Fix
<!-- What changes were made to fix it -->

### Testing
- [ ] Tested locally
- [ ] Verified fix resolves the issue
- [ ] No regression in related functionality

---
🚨 **HOTFIX** - Requires expedited review

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

    print_success "Pull Request created!"
    echo ""
    echo "After PR is merged, run: ./scripts/hotfix.sh sync"
}

# Sync hotfix worktree with main
sync_hotfix() {
    ensure_worktree

    print_info "Syncing main repository..."
    cd "$MAIN_REPO"
    git fetch origin
    git pull origin main

    print_info "Syncing hotfix worktree..."
    cd "$HOTFIX_REPO"
    git fetch origin
    git checkout hotfix/base
    git reset --hard origin/main

    print_success "Both worktrees synced with origin/main"
}

# List hotfix branches
list_hotfixes() {
    print_info "Active hotfix branches:"
    git branch -a | grep "hotfix/" | sed 's/^/  /'
    echo ""

    print_info "Open hotfix PRs:"
    gh pr list --search "head:hotfix/" --json number,title,state --template '{{range .}}  #{{.number}} {{.title}} ({{.state}}){{"\n"}}{{end}}'
}

# Show status
show_status() {
    echo "=== Dollor.ai Hotfix Workflow Status ==="
    echo ""

    print_info "Main Repository:"
    echo "  Path: $MAIN_REPO"
    cd "$MAIN_REPO"
    echo "  Branch: $(git branch --show-current)"
    echo "  Status: $(git status --short | wc -l | xargs) uncommitted files"
    echo ""

    if [ -d "$HOTFIX_REPO" ]; then
        print_info "Hotfix Worktree:"
        echo "  Path: $HOTFIX_REPO"
        cd "$HOTFIX_REPO"
        echo "  Branch: $(git branch --show-current)"
        echo "  Status: $(git status --short | wc -l | xargs) uncommitted files"
    else
        print_warning "Hotfix worktree not created yet"
        echo "  Run: ./scripts/hotfix.sh create <name>"
    fi
    echo ""

    print_info "Git Worktrees:"
    git worktree list
}

# Main command router
case "${1:-}" in
    create)
        create_hotfix "$2"
        ;;
    finish)
        finish_hotfix "$2"
        ;;
    sync)
        sync_hotfix
        ;;
    list)
        list_hotfixes
        ;;
    status)
        show_status
        ;;
    *)
        echo "Dollor.ai Hotfix Workflow"
        echo "========================="
        echo ""
        echo "Usage: ./scripts/hotfix.sh <command> [args]"
        echo ""
        echo "Commands:"
        echo "  create <name>    Create a new hotfix branch"
        echo "  finish [name]    Push and create PR for hotfix"
        echo "  sync             Sync hotfix worktree with main"
        echo "  list             List active hotfix branches"
        echo "  status           Show hotfix worktree status"
        echo ""
        echo "Examples:"
        echo "  ./scripts/hotfix.sh create payment-crash"
        echo "  ./scripts/hotfix.sh finish"
        echo "  ./scripts/hotfix.sh sync"
        ;;
esac
