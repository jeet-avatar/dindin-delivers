"""
Dollor.ai - Microservice Base Template
======================================

This template shows how to create a new microservice with:
- Structured logging
- Distributed tracing
- Prometheus metrics
- Health checks
- Error handling

To create a new service, copy this template and customize it.
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST

# Import shared components
from .logging.logger import create_logger, set_correlation_id
from .tracing.middleware import configure_tracing, TracingMiddleware
from .metrics.prometheus import MetricsCollector, get_metrics_endpoint, metrics_middleware
from .health.checks import HealthChecker
from .errors.error_codes import ErrorResponse, SystemErrors


class MicroserviceFactory:
    """
    Factory for creating standardized microservices.

    Usage:
        factory = MicroserviceFactory(
            service_name="order-service",
            version="1.0.0"
        )

        app = factory.create_app()

        # Add your routes
        @app.post("/orders")
        async def create_order():
            ...

        # Run with: uvicorn main:app --host 0.0.0.0 --port 8080
    """

    def __init__(
        self,
        service_name: str,
        version: str = "1.0.0",
        description: str = "",
        port: int = 8080,
        environment: str = None,
        enable_tracing: bool = True,
        enable_metrics: bool = True,
        cors_origins: list = None
    ):
        """
        Initialize microservice factory.

        Args:
            service_name: Name of the microservice
            version: Service version
            description: Service description
            port: Service port (for documentation)
            environment: Environment (dev, staging, production)
            enable_tracing: Enable OpenTelemetry tracing
            enable_metrics: Enable Prometheus metrics
            cors_origins: List of allowed CORS origins
        """
        self.service_name = service_name
        self.version = version
        self.description = description
        self.port = port
        self.environment = environment or os.getenv("ENVIRONMENT", "development")
        self.enable_tracing = enable_tracing
        self.enable_metrics = enable_metrics
        self.cors_origins = cors_origins or ["*"]

        # Initialize shared components
        self.logger = create_logger(service_name, self.environment)
        self.metrics = MetricsCollector(service_name, self.environment) if enable_metrics else None
        self.health_checker = HealthChecker(service_name, version, self.environment)

        # Initialize tracing
        if enable_tracing:
            otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
            self.tracer = configure_tracing(
                service_name=service_name,
                service_version=version,
                otlp_endpoint=otlp_endpoint,
                environment=self.environment
            )
        else:
            self.tracer = None

    def create_app(self) -> FastAPI:
        """
        Create and configure FastAPI application.

        Returns:
            Configured FastAPI application
        """

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Application lifespan handler."""
            self.logger.info(
                f"Starting {self.service_name}",
                version=self.version,
                environment=self.environment,
                port=self.port
            )
            yield
            self.logger.info(f"Shutting down {self.service_name}")

        # Create FastAPI app
        app = FastAPI(
            title=self.service_name,
            description=self.description,
            version=self.version,
            lifespan=lifespan,
            docs_url="/docs" if self.environment != "production" else None,
            redoc_url="/redoc" if self.environment != "production" else None,
        )

        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=self.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Add tracing middleware
        if self.enable_tracing:
            app.add_middleware(
                TracingMiddleware,
                service_name=self.service_name,
                environment=self.environment
            )

        # Add metrics middleware
        if self.enable_metrics:
            app.middleware("http")(metrics_middleware(self.service_name, self.environment))

        # Add global exception handler
        @app.exception_handler(Exception)
        async def global_exception_handler(request: Request, exc: Exception):
            """Handle all unhandled exceptions."""

            # Log the exception
            self.logger.exception(
                "Unhandled exception",
                path=request.url.path,
                method=request.method,
                error=str(exc)
            )

            # Record metric
            if self.metrics:
                self.metrics.record_exception(type(exc).__name__)

            # Return standardized error response
            error_response = ErrorResponse.from_exception(
                exception=exc,
                default_error=SystemErrors.UNKNOWN_ERROR,
                environment=self.environment,
                service=self.service_name
            )

            return JSONResponse(
                status_code=500,
                content=error_response
            )

        @app.exception_handler(HTTPException)
        async def http_exception_handler(request: Request, exc: HTTPException):
            """Handle HTTP exceptions."""

            self.logger.warning(
                "HTTP exception",
                path=request.url.path,
                method=request.method,
                status_code=exc.status_code,
                detail=exc.detail
            )

            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "success": False,
                    "error": {
                        "code": f"HTTP-{exc.status_code}",
                        "message": exc.detail,
                        "service": self.service_name,
                        "environment": self.environment
                    }
                }
            )

        # Add health check routes
        app.include_router(self.health_checker.router)

        # Add metrics endpoint
        if self.enable_metrics:
            @app.get("/metrics", include_in_schema=False)
            async def metrics_endpoint():
                """Prometheus metrics endpoint."""
                return Response(
                    content=get_metrics_endpoint(),
                    media_type=CONTENT_TYPE_LATEST
                )

        # Store references for access in routes
        app.state.logger = self.logger
        app.state.metrics = self.metrics
        app.state.health_checker = self.health_checker

        return app

    def add_dependency_check(
        self,
        name: str,
        check_fn,
        required: bool = True,
        timeout: float = 5.0
    ):
        """
        Add a dependency health check.

        Args:
            name: Name of the dependency
            check_fn: Function to check dependency health
            required: If True, failure marks service unhealthy
            timeout: Check timeout in seconds
        """
        self.health_checker.add_dependency(name, check_fn, required, timeout)

    @staticmethod
    def create(name: str, version: str = "1.0.0", description: str = ""):
        """
        Static factory method for backwards compatibility.
        Creates and returns a FastAPI app instance.

        This method exists for compatibility with older microservices that use:
            app = MicroserviceFactory.create("service-name", "1.0.0", "Description")

        Args:
            name: Service name
            version: Service version
            description: Service description

        Returns:
            FastAPI app instance
        """
        factory = MicroserviceFactory(
            service_name=name,
            version=version,
            description=description
        )
        return factory.create_app()


# =============================================================================
# EXAMPLE SERVICE IMPLEMENTATION
# =============================================================================

"""
Example: Creating the Order Service

# File: services/core/order-service/main.py

import os
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.common.service_template import MicroserviceFactory
from shared.common.health.checks import create_postgres_check, create_redis_check
from shared.common.errors.error_codes import OrderErrors, ErrorResponse

# Create service factory
factory = MicroserviceFactory(
    service_name="order-service",
    version="1.0.0",
    description="Handles order lifecycle management",
    port=8005
)

# Add dependency checks
factory.add_dependency_check(
    "postgres",
    create_postgres_check(os.getenv("DATABASE_URL")),
    required=True
)
factory.add_dependency_check(
    "redis",
    create_redis_check(os.getenv("REDIS_URL")),
    required=False
)

# Create the app
app = factory.create_app()

# Access shared components
logger = factory.logger
metrics = factory.metrics


# Define routes
@app.post("/orders")
async def create_order(order_data: dict):
    '''
    Create a new order.

    Error Codes:
    - ORD-101: Invalid order items
    - ORD-102: Restaurant closed
    - ORD-103: Item unavailable
    '''
    try:
        # Log the action
        logger.info("Creating order", user_id=order_data.get("user_id"))

        # Business logic here...

        # Record metric
        metrics.order_created(status="pending")

        return {"success": True, "order_id": "ORD-12345"}

    except ValueError as e:
        # Return specific error
        return ErrorResponse.build(
            error=OrderErrors.INVALID_ITEMS,
            details={"message": str(e)},
            environment=factory.environment,
            service="order-service"
        )


@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    '''
    Get order by ID.

    Error Codes:
    - ORD-201: Not authorized to view order
    - ORD-301: Order not found
    '''
    logger.info("Fetching order", order_id=order_id)

    # Fetch order logic...

    return {"order_id": order_id, "status": "pending"}


@app.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str):
    '''
    Cancel an order.

    Error Codes:
    - ORD-401: Cannot cancel - already picked up
    - ORD-301: Order not found
    '''
    logger.info("Cancelling order", order_id=order_id)

    # Cancel logic...
    metrics.order_cancelled(reason="customer_request")

    return {"success": True, "order_id": order_id, "status": "cancelled"}


# Run with:
# uvicorn main:app --host 0.0.0.0 --port 8005 --reload
"""
