"""
Dollor.ai - Shared Common Library
=================================

This library provides common utilities for all microservices:
- Logging: Structured JSON logging with trace context
- Tracing: OpenTelemetry distributed tracing
- Metrics: Prometheus metrics collection
- Health: Kubernetes health check endpoints
- Errors: Standardized error codes and responses

Usage:
    from shared.common import create_logger, MetricsCollector, HealthChecker
    from shared.common.errors import OrderErrors, ErrorResponse
"""

from .logging.logger import (
    create_logger,
    ServiceLogger,
    set_correlation_id,
    get_correlation_id,
    set_user_id,
    get_user_id,
    log_function_call
)

from .tracing.middleware import (
    configure_tracing,
    TracingMiddleware,
    create_child_span,
    instrument_database,
    instrument_redis,
    instrument_httpx
)

from .metrics.prometheus import (
    MetricsCollector,
    get_metrics_endpoint,
    metrics_middleware,
    HTTP_REQUEST_TOTAL,
    HTTP_REQUEST_DURATION,
    ERRORS_TOTAL,
    ORDERS_CREATED,
    PAYMENTS_PROCESSED
)

from .health.checks import (
    HealthChecker,
    HealthStatus,
    create_postgres_check,
    create_redis_check,
    create_rabbitmq_check,
    create_http_check,
    create_elasticsearch_check
)

from .errors.error_codes import (
    ErrorResponse,
    ErrorDetail,
    ServicePrefix,
    AuthErrors,
    UserErrors,
    DriverErrors,
    RestaurantErrors,
    OrderErrors,
    PaymentErrors,
    LocationErrors,
    MenuErrors,
    NotificationErrors,
    EmailErrors,
    DocumentErrors,
    SystemErrors
)

from .service_template import MicroserviceFactory

__all__ = [
    # Logging
    "create_logger",
    "ServiceLogger",
    "set_correlation_id",
    "get_correlation_id",
    "set_user_id",
    "get_user_id",
    "log_function_call",

    # Tracing
    "configure_tracing",
    "TracingMiddleware",
    "create_child_span",
    "instrument_database",
    "instrument_redis",
    "instrument_httpx",

    # Metrics
    "MetricsCollector",
    "get_metrics_endpoint",
    "metrics_middleware",
    "HTTP_REQUEST_TOTAL",
    "HTTP_REQUEST_DURATION",
    "ERRORS_TOTAL",
    "ORDERS_CREATED",
    "PAYMENTS_PROCESSED",

    # Health
    "HealthChecker",
    "HealthStatus",
    "create_postgres_check",
    "create_redis_check",
    "create_rabbitmq_check",
    "create_http_check",
    "create_elasticsearch_check",

    # Errors
    "ErrorResponse",
    "ErrorDetail",
    "ServicePrefix",
    "AuthErrors",
    "UserErrors",
    "DriverErrors",
    "RestaurantErrors",
    "OrderErrors",
    "PaymentErrors",
    "LocationErrors",
    "MenuErrors",
    "NotificationErrors",
    "EmailErrors",
    "DocumentErrors",
    "SystemErrors",

    # Service Factory
    "MicroserviceFactory",
]
