"""
Dollor.ai - Prometheus Metrics
==============================

Centralized metrics collection for all microservices.
Integrates with Prometheus for monitoring and alerting.

Standard Metrics:
- HTTP request count and latency
- Database query performance
- Cache hit/miss rates
- Business metrics (orders, payments, etc.)
"""

import time
from functools import wraps
from typing import Callable, Optional

# Optional prometheus_client import for CI/CD environments
PROMETHEUS_AVAILABLE = False
Counter = None
Histogram = None
Gauge = None
Summary = None
Info = None
REGISTRY = None
generate_latest = None
CONTENT_TYPE_LATEST = "text/plain"

try:
    from prometheus_client import Counter as _Counter, Histogram as _Histogram
    from prometheus_client import Gauge as _Gauge, Summary as _Summary
    from prometheus_client import Info as _Info, REGISTRY as _REGISTRY
    from prometheus_client import generate_latest as _generate_latest
    from prometheus_client import CONTENT_TYPE_LATEST as _CONTENT_TYPE_LATEST
    Counter = _Counter
    Histogram = _Histogram
    Gauge = _Gauge
    Summary = _Summary
    Info = _Info
    REGISTRY = _REGISTRY
    generate_latest = _generate_latest
    CONTENT_TYPE_LATEST = _CONTENT_TYPE_LATEST
    PROMETHEUS_AVAILABLE = True
except ImportError:
    pass


# Mock metric classes for when prometheus_client is not available
class MockMetric:
    """Mock metric that does nothing (for CI/CD environments)."""
    def __init__(self, *args, **kwargs):
        pass

    def labels(self, **kwargs):
        return self

    def inc(self, amount=1):
        pass

    def dec(self, amount=1):
        pass

    def set(self, value):
        pass

    def observe(self, value):
        pass

    def info(self, value):
        pass


def _create_counter(*args, **kwargs):
    if PROMETHEUS_AVAILABLE and Counter:
        return Counter(*args, **kwargs)
    return MockMetric()


def _create_histogram(*args, **kwargs):
    if PROMETHEUS_AVAILABLE and Histogram:
        return Histogram(*args, **kwargs)
    return MockMetric()


def _create_gauge(*args, **kwargs):
    if PROMETHEUS_AVAILABLE and Gauge:
        return Gauge(*args, **kwargs)
    return MockMetric()


def _create_info(*args, **kwargs):
    if PROMETHEUS_AVAILABLE and Info:
        return Info(*args, **kwargs)
    return MockMetric()

# =============================================================================
# HTTP METRICS
# =============================================================================

HTTP_REQUEST_TOTAL = _create_counter(
    "http_requests_total",
    "Total HTTP requests",
    ["service", "method", "endpoint", "status_code", "environment"]
)

HTTP_REQUEST_DURATION = _create_histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["service", "method", "endpoint", "environment"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

HTTP_REQUESTS_IN_PROGRESS = _create_gauge(
    "http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["service", "method", "endpoint", "environment"]
)


# =============================================================================
# DATABASE METRICS
# =============================================================================

DB_QUERY_TOTAL = _create_counter(
    "db_queries_total",
    "Total database queries",
    ["service", "operation", "table", "environment"]
)

DB_QUERY_DURATION = _create_histogram(
    "db_query_duration_seconds",
    "Database query latency in seconds",
    ["service", "operation", "table", "environment"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5)
)

DB_CONNECTIONS = _create_gauge(
    "db_connections",
    "Number of database connections",
    ["service", "state", "environment"]  # state: active, idle, total
)

DB_ERRORS = _create_counter(
    "db_errors_total",
    "Total database errors",
    ["service", "operation", "error_type", "environment"]
)


# =============================================================================
# CACHE METRICS
# =============================================================================

CACHE_OPERATIONS = _create_counter(
    "cache_operations_total",
    "Total cache operations",
    ["service", "operation", "result", "environment"]  # result: hit, miss
)

CACHE_LATENCY = _create_histogram(
    "cache_latency_seconds",
    "Cache operation latency",
    ["service", "operation", "environment"],
    buckets=(0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1)
)


# =============================================================================
# MESSAGE QUEUE METRICS
# =============================================================================

QUEUE_MESSAGES = _create_counter(
    "queue_messages_total",
    "Total messages processed",
    ["service", "queue", "operation", "environment"]  # operation: publish, consume
)

QUEUE_MESSAGE_LATENCY = _create_histogram(
    "queue_message_latency_seconds",
    "Message processing latency",
    ["service", "queue", "environment"],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 30.0)
)

QUEUE_DEPTH = _create_gauge(
    "queue_depth",
    "Number of messages in queue",
    ["service", "queue", "environment"]
)


# =============================================================================
# BUSINESS METRICS
# =============================================================================

# Order metrics
ORDERS_CREATED = _create_counter(
    "orders_created_total",
    "Total orders created",
    ["service", "environment", "status"]
)

ORDERS_COMPLETED = _create_counter(
    "orders_completed_total",
    "Total orders completed",
    ["service", "environment"]
)

ORDERS_CANCELLED = _create_counter(
    "orders_cancelled_total",
    "Total orders cancelled",
    ["service", "environment", "reason"]
)

ORDER_VALUE = _create_histogram(
    "order_value_dollars",
    "Order value in dollars",
    ["service", "environment"],
    buckets=(5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200)
)

ORDER_PROCESSING_TIME = _create_histogram(
    "order_processing_time_seconds",
    "Time from order creation to delivery",
    ["service", "environment"],
    buckets=(300, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200)  # 5min to 2hr
)

# Driver metrics
ACTIVE_DRIVERS = _create_gauge(
    "active_drivers_count",
    "Number of active drivers",
    ["service", "environment", "city"]
)

DRIVER_DELIVERIES = _create_counter(
    "driver_deliveries_total",
    "Total deliveries by drivers",
    ["service", "environment"]
)

# Payment metrics
PAYMENTS_PROCESSED = _create_counter(
    "payments_processed_total",
    "Total payments processed",
    ["service", "environment", "status", "method"]
)

PAYMENT_AMOUNT = _create_histogram(
    "payment_amount_dollars",
    "Payment amount in dollars",
    ["service", "environment"],
    buckets=(5, 10, 20, 50, 100, 200, 500, 1000)
)


# =============================================================================
# ERROR METRICS
# =============================================================================

ERRORS_TOTAL = _create_counter(
    "errors_total",
    "Total errors by error code",
    ["service", "error_code", "category", "environment"]
)

EXCEPTIONS_TOTAL = _create_counter(
    "exceptions_total",
    "Total unhandled exceptions",
    ["service", "exception_type", "environment"]
)


# =============================================================================
# SERVICE INFO
# =============================================================================

SERVICE_INFO = _create_info(
    "service",
    "Service information"
)


# =============================================================================
# METRICS HELPER CLASS
# =============================================================================

class MetricsCollector:
    """
    Helper class for collecting metrics in a microservice.

    Usage:
        metrics = MetricsCollector("order-service", "staging")

        # Track HTTP request
        with metrics.track_request("POST", "/orders") as tracker:
            response = await process_order()
            tracker.set_status(201)

        # Track database query
        with metrics.track_db_query("SELECT", "orders"):
            results = await db.fetch_orders()

        # Track business event
        metrics.order_created(order_id, status="pending")
    """

    def __init__(self, service_name: str, environment: str):
        self.service_name = service_name
        self.environment = environment

        # Set service info
        SERVICE_INFO.info({
            "service_name": service_name,
            "environment": environment
        })

    def track_request(self, method: str, endpoint: str):
        """Context manager to track HTTP request metrics."""
        return RequestTracker(self.service_name, method, endpoint, self.environment)

    def track_db_query(self, operation: str, table: str):
        """Context manager to track database query metrics."""
        return DBQueryTracker(self.service_name, operation, table, self.environment)

    def track_cache_operation(self, operation: str):
        """Context manager to track cache operation metrics."""
        return CacheOperationTracker(self.service_name, operation, self.environment)

    def record_error(self, error_code: str, category: str = "unknown"):
        """Record an error occurrence."""
        ERRORS_TOTAL.labels(
            service=self.service_name,
            error_code=error_code,
            category=category,
            environment=self.environment
        ).inc()

    def record_exception(self, exception_type: str):
        """Record an unhandled exception."""
        EXCEPTIONS_TOTAL.labels(
            service=self.service_name,
            exception_type=exception_type,
            environment=self.environment
        ).inc()

    def order_created(self, status: str = "pending"):
        """Record order creation."""
        ORDERS_CREATED.labels(
            service=self.service_name,
            environment=self.environment,
            status=status
        ).inc()

    def order_completed(self):
        """Record order completion."""
        ORDERS_COMPLETED.labels(
            service=self.service_name,
            environment=self.environment
        ).inc()

    def order_cancelled(self, reason: str):
        """Record order cancellation."""
        ORDERS_CANCELLED.labels(
            service=self.service_name,
            environment=self.environment,
            reason=reason
        ).inc()

    def record_order_value(self, value: float):
        """Record order value."""
        ORDER_VALUE.labels(
            service=self.service_name,
            environment=self.environment
        ).observe(value)

    def set_active_drivers(self, count: int, city: str = "all"):
        """Set active driver count."""
        ACTIVE_DRIVERS.labels(
            service=self.service_name,
            environment=self.environment,
            city=city
        ).set(count)

    def payment_processed(self, status: str, method: str):
        """Record payment processed."""
        PAYMENTS_PROCESSED.labels(
            service=self.service_name,
            environment=self.environment,
            status=status,
            method=method
        ).inc()


class RequestTracker:
    """Context manager for tracking HTTP request metrics."""

    def __init__(self, service: str, method: str, endpoint: str, environment: str):
        self.service = service
        self.method = method
        self.endpoint = endpoint
        self.environment = environment
        self.status_code = 200
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        HTTP_REQUESTS_IN_PROGRESS.labels(
            service=self.service,
            method=self.method,
            endpoint=self.endpoint,
            environment=self.environment
        ).inc()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        if exc_type is not None:
            self.status_code = 500

        HTTP_REQUEST_TOTAL.labels(
            service=self.service,
            method=self.method,
            endpoint=self.endpoint,
            status_code=str(self.status_code),
            environment=self.environment
        ).inc()

        HTTP_REQUEST_DURATION.labels(
            service=self.service,
            method=self.method,
            endpoint=self.endpoint,
            environment=self.environment
        ).observe(duration)

        HTTP_REQUESTS_IN_PROGRESS.labels(
            service=self.service,
            method=self.method,
            endpoint=self.endpoint,
            environment=self.environment
        ).dec()

        return False

    def set_status(self, status_code: int):
        """Set the response status code."""
        self.status_code = status_code


class DBQueryTracker:
    """Context manager for tracking database query metrics."""

    def __init__(self, service: str, operation: str, table: str, environment: str):
        self.service = service
        self.operation = operation
        self.table = table
        self.environment = environment
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        DB_QUERY_TOTAL.labels(
            service=self.service,
            operation=self.operation,
            table=self.table,
            environment=self.environment
        ).inc()

        DB_QUERY_DURATION.labels(
            service=self.service,
            operation=self.operation,
            table=self.table,
            environment=self.environment
        ).observe(duration)

        if exc_type is not None:
            DB_ERRORS.labels(
                service=self.service,
                operation=self.operation,
                error_type=exc_type.__name__,
                environment=self.environment
            ).inc()

        return False


class CacheOperationTracker:
    """Context manager for tracking cache operation metrics."""

    def __init__(self, service: str, operation: str, environment: str):
        self.service = service
        self.operation = operation
        self.environment = environment
        self.start_time = None
        self.hit = False

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        result = "hit" if self.hit else "miss"
        CACHE_OPERATIONS.labels(
            service=self.service,
            operation=self.operation,
            result=result,
            environment=self.environment
        ).inc()

        CACHE_LATENCY.labels(
            service=self.service,
            operation=self.operation,
            environment=self.environment
        ).observe(duration)

        return False

    def set_hit(self, hit: bool = True):
        """Set whether the cache operation was a hit."""
        self.hit = hit


# =============================================================================
# FASTAPI INTEGRATION
# =============================================================================

def get_metrics_endpoint():
    """
    Generate Prometheus metrics endpoint response.

    Usage:
        from fastapi import FastAPI, Response
        from shared.common.metrics import get_metrics_endpoint

        app = FastAPI()

        @app.get("/metrics")
        def metrics():
            return Response(
                content=get_metrics_endpoint(),
                media_type=CONTENT_TYPE_LATEST
            )
    """
    if PROMETHEUS_AVAILABLE and generate_latest:
        return generate_latest()
    return b"# Prometheus metrics not available"


def metrics_middleware(service_name: str, environment: str):
    """
    Create FastAPI middleware for automatic request metrics.

    Usage:
        from fastapi import FastAPI
        from shared.common.metrics import metrics_middleware

        app = FastAPI()
        app.middleware("http")(metrics_middleware("order-service", "staging"))
    """
    async def middleware(request, call_next):
        method = request.method
        endpoint = request.url.path

        # Skip metrics endpoint itself
        if endpoint == "/metrics":
            return await call_next(request)

        start_time = time.time()

        HTTP_REQUESTS_IN_PROGRESS.labels(
            service=service_name,
            method=method,
            endpoint=endpoint,
            environment=environment
        ).inc()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            raise
        finally:
            duration = time.time() - start_time

            HTTP_REQUEST_TOTAL.labels(
                service=service_name,
                method=method,
                endpoint=endpoint,
                status_code=str(status_code),
                environment=environment
            ).inc()

            HTTP_REQUEST_DURATION.labels(
                service=service_name,
                method=method,
                endpoint=endpoint,
                environment=environment
            ).observe(duration)

            HTTP_REQUESTS_IN_PROGRESS.labels(
                service=service_name,
                method=method,
                endpoint=endpoint,
                environment=environment
            ).dec()

        return response

    return middleware
