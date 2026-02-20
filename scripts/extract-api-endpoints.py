#!/usr/bin/env python3
"""
Extract all FastAPI route definitions from the backend codebase.

Produces a canonical API endpoint registry as a Markdown table with:
  - HTTP method
  - Full path
  - Auth status (public, auth-required, admin-only)
  - Source file:line

Usage:
    python scripts/extract-api-endpoints.py                  # stdout
    python scripts/extract-api-endpoints.py --output FILE    # write to file

Known limitations:
    - Regex-based, not AST-based. May miss computed routes or dynamic path construction.
    - Router prefix resolution relies on finding `APIRouter(prefix="...")` in the same file.
    - Does not detect auth added via include_router(..., dependencies=[...]) at mount time.
      Those are noted as "middleware-auth" since global middleware handles them.
    - WebSocket routes (@app.websocket) are not extracted.
"""

import re
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent.parent / "apps" / "web" / "p2p-platform" / "backend"

# Decorator regex: captures method and path from @app.get("/path") or @router.post("/path")
ROUTE_RE = re.compile(
    r'@(?:app|router)\.(get|post|put|delete|patch)\(\s*"([^"]+)"',
    re.IGNORECASE,
)

# Router prefix regex: captures prefix from APIRouter(prefix="/api/...")
ROUTER_PREFIX_RE = re.compile(
    r'(?:router|Router)\s*=\s*APIRouter\(\s*prefix\s*=\s*"([^"]+)"',
)

# Auth dependency patterns in function signatures (line after decorator)
AUTH_PATTERNS = {
    "require_admin": "admin-only",
    "require_vendor": "auth-required (vendor)",
    "require_driver": "auth-required (driver)",
    "require_customer": "auth-required (customer)",
    "require_any_auth": "auth-required",
    "get_current_customer": "auth-required (customer)",
    "get_current_driver": "auth-required (driver)",
    "get_current_vendor": "auth-required (vendor)",
    "admin_auth_middleware": "admin-only",
    "_require_admin_secret": "admin-secret",
}

# Public exact paths (copied from main_new.py for reference checking)
PUBLIC_EXACT_PATHS = {
    "/health", "/api/health", "/api/health/ready", "/api/health/live",
    "/api/erp/health/services", "/", "/privacy", "/terms",
    "/api/legal/terms", "/api/legal/privacy",
    "/api/legal/tos", "/api/legal/privacy-policy",
    "/api/config", "/register",
    "/api/auth/login", "/api/auth/customer/login", "/api/auth/customer/register",
    "/api/auth/customer/google", "/api/auth/customer/apple-auth",
    "/api/customer/apple-auth", "/api/customer/register",
    "/api/auth/driver/login", "/api/auth/driver/register",
    "/api/auth/driver/google", "/api/auth/driver/apple-auth",
    "/api/auth/vendor/login", "/api/auth/vendor/register",
    "/api/auth/vendor/demo-login",
    "/api/auth/vendor/google-auth", "/api/auth/vendor/apple-auth",
    "/api/admin/login",
    "/api/auth/admin/setup-production",
    "/api/auth/password-reset/request", "/api/auth/password-reset/confirm",
    "/api/tax/rates",
    "/api/vendors/published",
    "/api/promotions/featured", "/api/promotions/active",
    "/api/rides/surge", "/api/rides/estimate/bid-label", "/api/rides/pricing/tiers",
    "/api/payments/ride/pricing-info",
    "/api/erp/auth/login", "/api/erp/auth/register",
    "/api/erp/drivers/login", "/api/erp/drivers/register",
    "/api/erp/rides/estimate-fare", "/api/erp/rides/fare-estimate",
    "/api/rides/estimate", "/api/erp/rides/estimate",
    "/api/matchmaking/states/live", "/api/matchmaking/connection-fee",
    "/api/verification/providers",
    "/api/promotions/apply",
    "/api/websocket/stats",
    "/api/investor/request-access", "/api/investor/verify-access", "/api/investor/log-view",
    "/api/onboarding/accept", "/api/onboarding/scrape-menu",
}

PUBLIC_PREFIXES = [
    "/api/public/", "/api/webhooks/", "/api/legal/",
    "/api/customer/password-reset/", "/api/driver/password-reset/",
    "/api/vendor/password-reset/", "/api/erp/auth/",
    "/api/vendors/public", "/api/restaurants",
    "/uploads/", "/api/admin/", "/api/demo/",
    "/ws/", "/docs", "/openapi", "/redoc",
]


def is_public(path: str) -> bool:
    """Check if a path is in the public allowlist."""
    if path in PUBLIC_EXACT_PATHS:
        return True
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


def is_admin_path(path: str) -> bool:
    """Check if a path is under /api/admin/."""
    return path.startswith("/api/admin/")


def extract_routes_from_file(filepath: Path, rel_path: str):
    """Extract all route definitions from a single Python file."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return []

    lines = content.split("\n")

    # Detect router prefix (for files using APIRouter)
    prefix = ""
    prefix_match = ROUTER_PREFIX_RE.search(content)
    if prefix_match:
        prefix = prefix_match.group(1)

    routes = []
    for i, line in enumerate(lines):
        match = ROUTE_RE.search(line)
        if not match:
            continue

        method = match.group(1).upper()
        raw_path = match.group(2)

        # Determine if this is a router route or app route
        is_router = line.strip().startswith("@router.")
        if is_router and prefix:
            full_path = prefix + raw_path
        else:
            full_path = raw_path

        # Normalize: ensure path starts with /
        if not full_path.startswith("/"):
            full_path = "/" + full_path

        # Determine auth status by scanning the function signature (next few lines)
        auth_status = "middleware-auth"  # Default: protected by global middleware
        # Look at the next 5 lines for function def and its params
        func_lines = "\n".join(lines[i:i + 8])

        for pattern, label in AUTH_PATTERNS.items():
            if pattern in func_lines:
                auth_status = label
                break

        # Check public allowlist
        if is_public(full_path):
            auth_status = "public"
        elif is_admin_path(full_path):
            auth_status = "admin-only"

        line_num = i + 1  # 1-indexed
        routes.append({
            "method": method,
            "path": full_path,
            "auth": auth_status,
            "source": f"{rel_path}:{line_num}",
        })

    return routes


def main():
    output_file = None
    if "--output" in sys.argv:
        idx = sys.argv.index("--output")
        if idx + 1 < len(sys.argv):
            output_file = sys.argv[idx + 1]

    if not BACKEND_DIR.exists():
        print(f"ERROR: Backend directory not found: {BACKEND_DIR}", file=sys.stderr)
        sys.exit(1)

    # Collect all routes
    all_routes = []
    py_files = sorted(BACKEND_DIR.glob("*.py"))

    for py_file in py_files:
        rel_path = str(py_file.relative_to(BACKEND_DIR.parent.parent.parent.parent))
        routes = extract_routes_from_file(py_file, rel_path)
        all_routes.extend(routes)

    # Sort by path, then method
    all_routes.sort(key=lambda r: (r["path"], r["method"]))

    # Generate Markdown output
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    output_lines = [
        f"# API Endpoint Registry",
        f"",
        f"**Auto-generated:** {now}",
        f"**Source:** `scripts/extract-api-endpoints.py`",
        f"**Total routes:** {len(all_routes)}",
        f"**Backend dir:** `apps/web/p2p-platform/backend/`",
        f"",
        f"> Regenerate with: `python scripts/extract-api-endpoints.py --output .planning/API_REGISTRY.md`",
        f"",
        f"| Method | Path | Auth | Source |",
        f"|--------|------|------|--------|",
    ]

    for route in all_routes:
        output_lines.append(
            f"| {route['method']} | `{route['path']}` | {route['auth']} | `{route['source']}` |"
        )

    # Summary stats
    public_count = sum(1 for r in all_routes if r["auth"] == "public")
    admin_count = sum(1 for r in all_routes if "admin" in r["auth"])
    auth_count = len(all_routes) - public_count - admin_count

    output_lines.extend([
        "",
        "## Summary",
        "",
        f"- **Public endpoints:** {public_count}",
        f"- **Auth-required endpoints:** {auth_count}",
        f"- **Admin-only endpoints:** {admin_count}",
        f"- **Total:** {len(all_routes)}",
        "",
        "## Known Confusions",
        "",
        "| Endpoint | Status | Notes |",
        "|----------|--------|-------|",
        "| `/api/vendors/published` | EXISTS (public) | Vendor listing endpoint |",
        "| `/api/promotions/featured` | EXISTS (public) | Promotional deals endpoint |",
        "| `/api/vendors/featured` | DOES NOT EXIST | Phantom -- never defined in backend |",
    ])

    text = "\n".join(output_lines) + "\n"

    if output_file:
        out_path = Path(output_file)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text, encoding="utf-8")
        print(f"Written {len(all_routes)} routes to {output_file}")
    else:
        print(text)

    return 0


if __name__ == "__main__":
    sys.exit(main())
