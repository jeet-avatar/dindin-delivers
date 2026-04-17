"""
Phase 13: IP allowlist middleware.

Reads ALLOWED_IP_RANGES environment variable (comma-separated CIDR notation).
If unset or empty → allow all traffic (backward compatible).
If set → extract client IP and reject with 403 if not in any listed network.

Client IP extraction order:
  1. X-Real-IP header (set by nginx reverse proxy)
  2. request.client.host (direct connection fallback)

/health is always allowed (monitoring tools may come from outside the allowlist).

Example:
  ALLOWED_IP_RANGES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

CLAUDE.md rule: This middleware must NOT block /health (needed for ECS health checks).
"""
import ipaddress
import logging
import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

_ALWAYS_ALLOW_PATHS = {"/health"}


class IPAllowlistMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that blocks requests from IPs outside ALLOWED_IP_RANGES.
    If ALLOWED_IP_RANGES is not set or empty, all IPs are allowed (backward compatible).
    """

    def __init__(self, app):
        super().__init__(app)
        self._networks = self._load_networks()

    def _load_networks(self) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
        raw = os.getenv("ALLOWED_IP_RANGES", "").strip()
        if not raw:
            return []
        networks = []
        for cidr in raw.split(","):
            cidr = cidr.strip()
            if not cidr:
                continue
            try:
                networks.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError:
                logger.warning(f"IPAllowlistMiddleware: invalid CIDR '{cidr}' — skipping")
        logger.info(f"IPAllowlistMiddleware: loaded {len(networks)} network(s) from ALLOWED_IP_RANGES")
        return networks

    async def dispatch(self, request: Request, call_next):
        # Always allow /health (monitoring tools, ECS health checks)
        if request.url.path in _ALWAYS_ALLOW_PATHS:
            return await call_next(request)

        # If no allowlist configured, allow all (backward compatible)
        if not self._networks:
            return await call_next(request)

        client_ip_str = (
            request.headers.get("X-Real-IP")
            or (request.client.host if request.client else None)
        )

        if not client_ip_str:
            logger.warning("IPAllowlistMiddleware: could not determine client IP — allowing request")
            return await call_next(request)

        try:
            client_ip = ipaddress.ip_address(client_ip_str)
        except ValueError:
            logger.warning(f"IPAllowlistMiddleware: unparseable client IP '{client_ip_str}' — blocking")
            return JSONResponse(
                {"detail": "IP not permitted"},
                status_code=403,
            )

        for network in self._networks:
            if client_ip in network:
                return await call_next(request)

        logger.info(f"IPAllowlistMiddleware: blocked {client_ip_str} (not in allowlist), path={request.url.path}")
        return JSONResponse(
            {"detail": "IP not permitted"},
            status_code=403,
        )
