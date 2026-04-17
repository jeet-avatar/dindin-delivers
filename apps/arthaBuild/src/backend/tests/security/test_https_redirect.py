"""
CASE-188: HTTPS redirect static analysis.
"""
import os

NGINX_PROD_CONF = os.path.join(
    os.path.dirname(__file__), "../../../..", "nginx/nginx.prod.conf"
)


def test_nginx_prod_http_redirects_to_https():
    with open(NGINX_PROD_CONF) as f:
        content = f.read()
    assert "return 301 https://$host$request_uri" in content, \
        "nginx.prod.conf must redirect HTTP->HTTPS with 301"
    assert "listen 80" in content, "Port 80 block must exist for redirect"
    assert "listen 443 ssl" in content, "Port 443 SSL block must exist"


def test_nginx_dev_conf_unchanged():
    """nginx.conf (dev) must still be port 80 only -- dev workflow must not break."""
    nginx_dev = os.path.join(
        os.path.dirname(__file__), "../../../..", "nginx/nginx.conf"
    )
    with open(nginx_dev) as f:
        content = f.read()
    # Dev config must NOT redirect to HTTPS (no 301 redirect)
    assert "return 301 https" not in content, \
        "Dev nginx.conf must not redirect to HTTPS -- that breaks docker-compose dev workflow"
