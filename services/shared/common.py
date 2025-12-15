# Dollor.ai Common Utilities
# ==========================
# Shared utilities for all microservices

import os
import logging
from datetime import datetime
from typing import Optional, List
from enum import Enum

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =============================================================================
# LOGGING
# =============================================================================

def create_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Create a structured logger for a service."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))

    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


class StructuredLogger:
    """Logger with structured logging support."""

    def __init__(self, name: str):
        self.logger = create_logger(name)
        self.name = name

    def _format_extra(self, **kwargs) -> str:
        if kwargs:
            return " | " + " ".join(f"{k}={v}" for k, v in kwargs.items())
        return ""

    def info(self, message: str, **kwargs):
        self.logger.info(f"{message}{self._format_extra(**kwargs)}")

    def warning(self, message: str, **kwargs):
        self.logger.warning(f"{message}{self._format_extra(**kwargs)}")

    def error(self, message: str, **kwargs):
        self.logger.error(f"{message}{self._format_extra(**kwargs)}")

    def debug(self, message: str, **kwargs):
        self.logger.debug(f"{message}{self._format_extra(**kwargs)}")


# =============================================================================
# ERROR DEFINITIONS
# =============================================================================

class ErrorCode(BaseModel):
    """Standard error code definition."""
    code: str
    message: str
    http_status: int = 400


class AuthErrors:
    """Authentication error codes."""
    INVALID_EMAIL = ErrorCode(code="AUTH-101", message="Invalid email format", http_status=400)
    WEAK_PASSWORD = ErrorCode(code="AUTH-102", message="Password does not meet requirements", http_status=400)
    EMAIL_EXISTS = ErrorCode(code="AUTH-103", message="Email already registered", http_status=400)
    INVALID_CREDENTIALS = ErrorCode(code="AUTH-201", message="Invalid credentials", http_status=401)
    ACCOUNT_INACTIVE = ErrorCode(code="AUTH-202", message="Account not active", http_status=403)
    TOKEN_EXPIRED = ErrorCode(code="AUTH-203", message="Token expired", http_status=401)
    USER_NOT_FOUND = ErrorCode(code="AUTH-301", message="User not found", http_status=404)


class DriverErrors:
    """Driver-related error codes."""
    INVALID_PHONE = ErrorCode(code="DRV-101", message="Invalid phone format", http_status=400)
    INVALID_LICENSE = ErrorCode(code="DRV-102", message="Invalid license", http_status=400)
    DRIVER_NOT_FOUND = ErrorCode(code="DRV-301", message="Driver not found", http_status=404)


class OrderErrors:
    """Order-related error codes."""
    ORDER_NOT_FOUND = ErrorCode(code="ORD-301", message="Order not found", http_status=404)
    INVALID_STATUS = ErrorCode(code="ORD-401", message="Invalid order status transition", http_status=400)


class PaymentErrors:
    """Payment-related error codes."""
    PAYMENT_FAILED = ErrorCode(code="PAY-501", message="Payment processing failed", http_status=402)
    INVALID_CARD = ErrorCode(code="PAY-502", message="Invalid card details", http_status=400)


# =============================================================================
# ERROR RESPONSE
# =============================================================================

class ErrorResponse:
    """Standard error response builder."""

    @staticmethod
    def build(
        error: ErrorCode,
        environment: str = "production",
        service: str = "unknown",
        details: Optional[str] = None
    ):
        """Build a standard error response."""
        raise HTTPException(
            status_code=error.http_status,
            detail={
                "code": error.code,
                "message": error.message,
                "details": details if environment != "production" else None,
                "service": service,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


# =============================================================================
# MICROSERVICE FACTORY
# =============================================================================

class MicroserviceFactory:
    """Factory for creating standardized microservice applications."""

    def __init__(
        self,
        service_name: str,
        version: str = "1.0.0",
        description: str = "",
        port: int = 8000,
        cors_origins: Optional[List[str]] = None
    ):
        self.service_name = service_name
        self.version = version
        self.description = description
        self.port = port
        self.cors_origins = cors_origins or ["*"]
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.logger = StructuredLogger(service_name)

    def create_app(self) -> FastAPI:
        """Create a FastAPI application with standard configuration."""
        app = FastAPI(
            title=f"Dollor.ai - {self.service_name}",
            description=self.description,
            version=self.version,
            docs_url="/docs",
            redoc_url="/redoc"
        )

        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=self.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Add health endpoint
        @app.get("/health")
        async def health_check():
            return {
                "service": self.service_name,
                "version": self.version,
                "status": "healthy",
                "environment": self.environment,
                "timestamp": datetime.utcnow().isoformat()
            }

        # Add ready endpoint
        @app.get("/ready")
        async def ready_check():
            return {"status": "ready"}

        self.logger.info(
            f"Created {self.service_name} application",
            version=self.version,
            environment=self.environment
        )

        return app
