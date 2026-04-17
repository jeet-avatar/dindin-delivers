"""
Response Envelope Middleware
==============================
Phase 16: Wraps /api/v1/ responses in a standard envelope:
    {"data": <original>, "error": null, "meta": {"version": "v1", "timestamp": "<ISO8601>"}}

Only applies to routes that match /api/v1/. All other routes pass through unchanged.

Envelope format:
  - 2xx JSON: {"data": <original_body>, "error": null, "meta": {...}}
  - 4xx/5xx JSON: {"data": null, "error": <original_body>, "meta": {...}}
  - Non-JSON or non-v1 routes: unchanged

Architecture layer: Middleware
Phase: 16 — API Platform
"""
import json
import logging
from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ResponseEnvelopeMiddleware(BaseHTTPMiddleware):
    """
    Middleware: wraps /api/v1/ JSON responses in the standard envelope.
    Non-/api/v1/ routes pass through unchanged.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Only intercept /api/v1/ routes
        if not request.url.path.startswith("/api/v1/"):
            return response

        # Only wrap JSON responses
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        # Read the response body
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk

        try:
            original_body = json.loads(body_bytes)
        except (json.JSONDecodeError, ValueError):
            # Not valid JSON — return as-is (shouldn't happen but guard anyway)
            return Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=content_type,
            )

        meta = {
            "version": "v1",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if 200 <= response.status_code < 300:
            envelope = {
                "data": original_body,
                "error": None,
                "meta": meta,
            }
        else:
            envelope = {
                "data": None,
                "error": original_body,
                "meta": meta,
            }

        wrapped_bytes = json.dumps(envelope).encode("utf-8")

        # Rebuild response with updated Content-Length
        headers = dict(response.headers)
        headers["content-length"] = str(len(wrapped_bytes))
        headers["content-type"] = "application/json"

        return Response(
            content=wrapped_bytes,
            status_code=response.status_code,
            headers=headers,
            media_type="application/json",
        )
