"""
Dollor.ai - OpenTelemetry Tracing Middleware
============================================

Provides distributed tracing across all microservices.
Integrates with Jaeger for trace visualization.

Headers Propagated:
- X-Correlation-ID: Unique request identifier
- X-Request-ID: Alias for correlation ID
- traceparent: W3C Trace Context
- tracestate: W3C Trace Context state
"""

import uuid
import time
from typing import Callable, Optional
from contextvars import ContextVar

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Try to import OpenTelemetry - each import is optional
OPENTELEMETRY_AVAILABLE = False
trace = None
SpanKind = None
Status = None
StatusCode = None

try:
    from opentelemetry import trace as _trace
    from opentelemetry.trace import SpanKind as _SpanKind, Status as _Status, StatusCode as _StatusCode
    trace = _trace
    SpanKind = _SpanKind
    Status = _Status
    StatusCode = _StatusCode
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    pass

# Optional SDK imports
TracerProvider = None
BatchSpanProcessor = None
Resource = None
OTLPSpanExporter = None
extract = None
inject = None

if OPENTELEMETRY_AVAILABLE:
    try:
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
        from opentelemetry.propagate import extract, inject
    except ImportError:
        pass

    try:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    except ImportError:
        pass

# Import logging utilities
from ..logging.logger import set_correlation_id, set_user_id


def configure_tracing(
    service_name: str,
    service_version: str = "1.0.0",
    otlp_endpoint: str = None,
    environment: str = "development"
) -> Optional["trace.Tracer"]:  # type: ignore
    """
    Configure OpenTelemetry tracing for a service.

    Args:
        service_name: Name of the microservice
        service_version: Version of the service
        otlp_endpoint: OTLP collector endpoint (e.g., "http://otel-collector:4317")
        environment: Current environment

    Returns:
        Configured tracer or None if OpenTelemetry not available

    Example:
        from shared.common.tracing import configure_tracing

        tracer = configure_tracing(
            service_name="order-service",
            otlp_endpoint="http://otel-collector:4317",
            environment="staging"
        )
    """
    if not OPENTELEMETRY_AVAILABLE:
        return None

    import os

    # Get OTLP endpoint from environment if not provided
    if otlp_endpoint is None:
        otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")

    # Create resource with service information
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        "deployment.environment": environment,
    })

    # Create tracer provider
    provider = TracerProvider(resource=resource)

    # Configure OTLP exporter
    try:
        exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    except Exception as e:
        print(f"Warning: Could not configure OTLP exporter: {e}")

    # Set as global tracer provider
    trace.set_tracer_provider(provider)

    # Return tracer for the service
    return trace.get_tracer(service_name, service_version)


class TracingMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for distributed tracing.

    Features:
    - Generates or propagates correlation ID
    - Creates trace spans for each request
    - Adds request/response attributes to spans
    - Integrates with logging context

    Usage:
        from fastapi import FastAPI
        from shared.common.tracing import TracingMiddleware

        app = FastAPI()
        app.add_middleware(TracingMiddleware, service_name="order-service")
    """

    def __init__(
        self,
        app,
        service_name: str,
        environment: str = "development",
        excluded_paths: list = None
    ):
        """
        Initialize tracing middleware.

        Args:
            app: FastAPI application
            service_name: Name of the microservice
            environment: Current environment
            excluded_paths: Paths to exclude from tracing (e.g., ["/health", "/metrics"])
        """
        super().__init__(app)
        self.service_name = service_name
        self.environment = environment
        self.excluded_paths = excluded_paths or ["/health", "/metrics", "/ready", "/live"]

        if OPENTELEMETRY_AVAILABLE:
            self.tracer = trace.get_tracer(service_name)
        else:
            self.tracer = None

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with tracing."""

        # Skip tracing for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)

        # Get or generate correlation ID
        correlation_id = (
            request.headers.get("X-Correlation-ID") or
            request.headers.get("X-Request-ID") or
            str(uuid.uuid4())
        )

        # Set correlation ID in logging context
        set_correlation_id(correlation_id)

        # Extract user ID from JWT if present
        user_id = self._extract_user_id(request)
        if user_id:
            set_user_id(user_id)

        start_time = time.time()

        if self.tracer and OPENTELEMETRY_AVAILABLE:
            # Extract trace context from incoming request
            context = extract(request.headers)

            # Create span for this request
            with self.tracer.start_as_current_span(
                name=f"{request.method} {request.url.path}",
                kind=SpanKind.SERVER,
                context=context,
                attributes={
                    "http.method": request.method,
                    "http.url": str(request.url),
                    "http.route": request.url.path,
                    "http.host": request.headers.get("host", ""),
                    "http.user_agent": request.headers.get("user-agent", ""),
                    "correlation_id": correlation_id,
                    "service.name": self.service_name,
                    "environment": self.environment,
                }
            ) as span:
                if user_id:
                    span.set_attribute("user.id", user_id)

                try:
                    response = await call_next(request)

                    # Add response attributes
                    span.set_attribute("http.status_code", response.status_code)

                    if response.status_code >= 400:
                        span.set_status(Status(StatusCode.ERROR))
                    else:
                        span.set_status(Status(StatusCode.OK))

                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise

                finally:
                    duration = (time.time() - start_time) * 1000
                    span.set_attribute("http.duration_ms", round(duration, 2))

        else:
            # No tracing available, just process request
            response = await call_next(request)

        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id

        # Add trace ID to response headers if available
        if OPENTELEMETRY_AVAILABLE:
            span = trace.get_current_span()
            if span and span.is_recording():
                ctx = span.get_span_context()
                response.headers["X-Trace-ID"] = format(ctx.trace_id, "032x")

        return response

    def _extract_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from JWT token in Authorization header."""
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None

        try:
            import jwt
            token = auth_header.split(" ")[1]
            # Decode without verification to extract user ID
            # Actual verification should happen in auth middleware
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub") or payload.get("user_id")
        except Exception:
            return None


def create_child_span(
    name: str,
    kind=None,  # SpanKind, defaults to INTERNAL
    attributes: dict = None
):
    """
    Create a child span for internal operations.

    Usage:
        with create_child_span("database_query", attributes={"table": "orders"}) as span:
            result = await db.fetch_orders()
            span.set_attribute("row_count", len(result))
    """
    if not OPENTELEMETRY_AVAILABLE:
        from contextlib import nullcontext
        return nullcontext()

    # Default to INTERNAL if not specified
    if kind is None:
        kind = SpanKind.INTERNAL

    tracer = trace.get_tracer(__name__)
    return tracer.start_as_current_span(
        name=name,
        kind=kind,
        attributes=attributes or {}
    )


def instrument_database(engine):
    """
    Instrument SQLAlchemy database engine with tracing.

    Usage:
        from sqlalchemy import create_engine
        engine = create_engine("postgresql://...")
        instrument_database(engine)
    """
    if not OPENTELEMETRY_AVAILABLE:
        return

    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        SQLAlchemyInstrumentor().instrument(engine=engine)
    except ImportError:
        pass


def instrument_redis(client):
    """
    Instrument Redis client with tracing.

    Usage:
        import redis
        r = redis.Redis()
        instrument_redis(r)
    """
    if not OPENTELEMETRY_AVAILABLE:
        return

    try:
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        RedisInstrumentor().instrument()
    except ImportError:
        pass


def instrument_httpx():
    """
    Instrument HTTPX client for outgoing HTTP request tracing.

    Usage:
        instrument_httpx()
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.example.com")
    """
    if not OPENTELEMETRY_AVAILABLE:
        return

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
    except ImportError:
        pass
