---
created: 2026-03-14T00:00:00Z
title: Audit and tighten CSP and security headers in production
area: security/headers
severity: LOW
files:
  - apps/web/p2p-platform/backend/main_new.py:161-182
---

## Problem

Security headers are set in `fix_cors_and_security_headers` middleware at `main_new.py:162`. Current CSP at `main_new.py:177` is `default-src 'self'; frame-ancestors 'none'`. Needs verification that:
- CSP doesn't use `unsafe-inline` (was added temporarily for admin portal — `main_new.py` notes mention it)
- All headers are applied to API AND frontend responses
- Headers are being sent correctly in production (not stripped by CloudFront)

## Solution

1. **Verify headers on production**:
   ```bash
   curl -I https://api.dollor.ai/api/health
   # Check: X-Content-Type-Options, X-Frame-Options, CSP, HSTS, Referrer-Policy
   ```

2. **Check CSP on admin portal** (CloudFront S3 origin — headers may not be set):
   ```bash
   curl -I https://d3pus2gxlb5cer.cloudfront.net/admin
   ```

3. **Add CloudFront Response Headers Policy** if admin portal headers are missing

4. **Review CSP `unsafe-inline`**: Was added as workaround for antd CSS (`debug/resolved/admin-portal-ui-broken-except-cm-pt.md`). Should be tightened with nonces or hashes.

5. **Add `Permissions-Policy` header** if not present: `camera=(), microphone=(), geolocation=(self)`

6. **HSTS preload**: Consider adding `dollor.ai` to HSTS preload list (hstspreload.org)
