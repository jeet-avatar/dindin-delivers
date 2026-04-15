"""
CASE-189: Security headers static analysis.
Tests parse nginx.prod.conf as text -- do NOT make live HTTP requests.
Nginx headers bypass HTTPX async test client (which talks to FastAPI directly).
"""
import os

NGINX_PROD_CONF = os.path.join(
    os.path.dirname(__file__), "../../../..", "nginx/nginx.prod.conf"
)


def _read_nginx():
    with open(NGINX_PROD_CONF) as f:
        return f.read()


def test_nginx_prod_has_hsts_header():
    content = _read_nginx()
    assert "Strict-Transport-Security" in content, "Missing HSTS header"
    assert "max-age=31536000" in content, "HSTS max-age must be 1 year (31536000)"
    assert "includeSubDomains" in content, "HSTS must include subdomains"


def test_nginx_prod_has_x_frame_options():
    content = _read_nginx()
    assert "X-Frame-Options" in content
    assert "DENY" in content


def test_nginx_prod_has_x_content_type_options():
    content = _read_nginx()
    assert "X-Content-Type-Options" in content
    assert "nosniff" in content


def test_nginx_prod_has_referrer_policy():
    content = _read_nginx()
    assert "Referrer-Policy" in content
    assert "strict-origin-when-cross-origin" in content


def test_nginx_prod_has_csp_report_only():
    content = _read_nginx()
    assert "Content-Security-Policy-Report-Only" in content, "CSP must be in report-only mode for v1.0"
    assert "default-src 'self'" in content


def test_nginx_prod_has_hsts_header():
    """CASE-189: nginx.prod.conf must configure HSTS (Strict-Transport-Security)."""
    with open(NGINX_PROD_CONF) as f:
        content = f.read()
    assert "Strict-Transport-Security" in content, \
        "CASE-189: nginx.prod.conf must include Strict-Transport-Security header"
