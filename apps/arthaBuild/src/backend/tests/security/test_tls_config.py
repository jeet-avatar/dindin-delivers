"""
CASE-195: TLS hardening static analysis.
"""
import os

NGINX_PROD_CONF = os.path.join(
    os.path.dirname(__file__), "../../../..", "nginx/nginx.prod.conf"
)


def test_nginx_prod_tls_protocols():
    with open(NGINX_PROD_CONF) as f:
        content = f.read()
    assert "ssl_protocols TLSv1.2 TLSv1.3" in content, \
        "Must allow only TLS 1.2 and 1.3"


def test_nginx_prod_no_deprecated_protocols():
    with open(NGINX_PROD_CONF) as f:
        content = f.read()
    # Comments are allowed to mention the deprecated names (explaining why they are absent)
    # Only actual ssl_protocols directives must not include deprecated versions
    lines = content.split("\n")
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#"):
            continue  # skip comments
        assert "SSLv3" not in stripped, "SSLv3 is deprecated -- must not appear in directives"
        assert "TLSv1.0" not in stripped, "TLSv1.0 is deprecated (RFC 8996)"
        assert "TLSv1.1" not in stripped, "TLSv1.1 is deprecated (RFC 8996)"


def test_nginx_prod_has_mozilla_intermediate_ciphers():
    with open(NGINX_PROD_CONF) as f:
        content = f.read()
    assert "ECDHE-RSA-AES128-GCM-SHA256" in content, \
        "Mozilla Intermediate cipher suite must be present"


def test_nginx_prod_has_ssl_ciphers():
    """CASE-195: nginx.prod.conf must configure ssl_ciphers directive."""
    with open(NGINX_PROD_CONF) as f:
        content = f.read()
    assert "ssl_ciphers" in content, \
        "CASE-195: nginx.prod.conf must configure ssl_ciphers directive"
