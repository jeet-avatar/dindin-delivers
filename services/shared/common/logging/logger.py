"""
Dollor.ai - Centralized Logging Configuration
==============================================

Structured logging with OpenTelemetry trace context integration.
Provides consistent log format across all microservices.

Log Format (JSON):
{
    "timestamp": "2024-12-14T10:30:00.123Z",
    "level": "INFO",
    "service": "order-service",
    "environment": "staging",
    "trace_id": "abc123def456",
    "span_id": "xyz789",
    "correlation_id": "req-12345",
    "message": "Order created successfully",
    "extra": {
        "order_id": "ORD-12345",
        "user_id": "USR-67890"
    }
}
"""

import logging
import sys
import json
from datetime import datetime
from typing import Optional, Dict, Any
from contextvars import ContextVar

# Context variables for request-scoped data
correlation_id_var: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    Includes OpenTelemetry trace context when available.
    """

    def __init__(self, service_name: str, environment: str):
        super().__init__()
        self.service_name = service_name
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""

        # Base log structure
        log_entry = {
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "level": record.levelname,
            "service": self.service_name,
            "environment": self.environment,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add trace context from OpenTelemetry
        try:
            from opentelemetry import trace
            span = trace.get_current_span()
            if span and span.is_recording():
                ctx = span.get_span_context()
                log_entry["trace_id"] = format(ctx.trace_id, "032x")
                log_entry["span_id"] = format(ctx.span_id, "016x")
        except ImportError:
            pass  # OpenTelemetry not installed

        # Add correlation ID from context
        correlation_id = correlation_id_var.get()
        if correlation_id:
            log_entry["correlation_id"] = correlation_id

        # Add user ID from context
        user_id = user_id_var.get()
        if user_id:
            log_entry["user_id"] = user_id

        # Add extra fields
        if hasattr(record, "extra") and record.extra:
            log_entry["extra"] = record.extra

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "stacktrace": self.formatException(record.exc_info) if self.environment != "production" else None
            }

        # Add source location (only in non-production)
        if self.environment != "production":
            log_entry["source"] = {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName
            }

        return json.dumps(log_entry, default=str)


class ServiceLogger:
    """
    Service-specific logger with structured logging support.

    Usage:
        logger = ServiceLogger("order-service", "staging")
        logger.info("Order created", order_id="ORD-123", user_id="USR-456")
        logger.error("Payment failed", error_code="PAY-501", exc_info=True)
    """

    def __init__(self, service_name: str, environment: str, log_level: str = None):
        """
        Initialize the service logger.

        Args:
            service_name: Name of the microservice
            environment: Current environment (dev, staging, production)
            log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        self.service_name = service_name
        self.environment = environment

        # Determine log level based on environment
        if log_level is None:
            log_level = {
                "dev": "DEBUG",
                "development": "DEBUG",
                "staging": "INFO",
                "production": "WARNING"
            }.get(environment.lower(), "INFO")

        # Configure the logger
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(getattr(logging, log_level.upper()))

        # Remove existing handlers
        self.logger.handlers.clear()

        # Add JSON handler for stdout
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter(service_name, environment))
        self.logger.addHandler(handler)

        # Prevent propagation to root logger
        self.logger.propagate = False

    def _log(self, level: int, message: str, **kwargs):
        """Internal logging method with extra fields support."""
        extra_data = kwargs.pop("extra", {})
        extra_data.update(kwargs)

        record = self.logger.makeRecord(
            name=self.logger.name,
            level=level,
            fn="",
            lno=0,
            msg=message,
            args=(),
            exc_info=kwargs.get("exc_info")
        )
        record.extra = extra_data if extra_data else None
        self.logger.handle(record)

    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self._log(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        """Log info message."""
        self._log(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self._log(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        """Log error message."""
        self._log(logging.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs):
        """Log critical message."""
        self._log(logging.CRITICAL, message, **kwargs)

    def exception(self, message: str, **kwargs):
        """Log exception with traceback."""
        kwargs["exc_info"] = True
        self._log(logging.ERROR, message, **kwargs)


def set_correlation_id(correlation_id: str):
    """Set correlation ID for the current request context."""
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> Optional[str]:
    """Get correlation ID from the current request context."""
    return correlation_id_var.get()


def set_user_id(user_id: str):
    """Set user ID for the current request context."""
    user_id_var.set(user_id)


def get_user_id() -> Optional[str]:
    """Get user ID from the current request context."""
    return user_id_var.get()


def create_logger(service_name: str, environment: str = None, log_level: str = None) -> ServiceLogger:
    """
    Factory function to create a service logger.

    Args:
        service_name: Name of the microservice
        environment: Current environment (defaults to ENVIRONMENT env var)
        log_level: Log level (defaults based on environment)

    Returns:
        Configured ServiceLogger instance

    Example:
        from shared.common.logging import create_logger

        logger = create_logger("order-service")
        logger.info("Starting order service")
    """
    import os

    if environment is None:
        environment = os.getenv("ENVIRONMENT", "development")

    return ServiceLogger(service_name, environment, log_level)


# =============================================================================
# LOGGING DECORATORS
# =============================================================================

def log_function_call(logger: ServiceLogger):
    """
    Decorator to log function entry and exit.

    Usage:
        @log_function_call(logger)
        async def create_order(order_data: dict):
            ...
    """
    import functools
    import time

    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            logger.debug(f"Entering {func.__name__}", args_count=len(args), kwargs_keys=list(kwargs.keys()))

            try:
                result = await func(*args, **kwargs)
                duration = (time.time() - start_time) * 1000
                logger.debug(f"Exiting {func.__name__}", duration_ms=round(duration, 2))
                return result
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                logger.error(f"Exception in {func.__name__}", duration_ms=round(duration, 2), error=str(e))
                raise

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            logger.debug(f"Entering {func.__name__}", args_count=len(args), kwargs_keys=list(kwargs.keys()))

            try:
                result = func(*args, **kwargs)
                duration = (time.time() - start_time) * 1000
                logger.debug(f"Exiting {func.__name__}", duration_ms=round(duration, 2))
                return result
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                logger.error(f"Exception in {func.__name__}", duration_ms=round(duration, 2), error=str(e))
                raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
