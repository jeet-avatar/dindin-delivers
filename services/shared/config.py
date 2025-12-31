# Dollor.ai Shared Configuration
# ===============================
# Common configuration utilities

import os
from typing import Optional

def get_env(key: str, default: Optional[str] = None) -> Optional[str]:
    """Get environment variable with optional default."""
    return os.getenv(key, default)

def get_required_env(key: str) -> str:
    """Get required environment variable or raise error."""
    value = os.getenv(key)
    if value is None:
        raise ValueError(f"Required environment variable {key} is not set")
    return value

class BaseSettings:
    """Base settings class for microservices."""

    ENVIRONMENT: str = get_env("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"
    LOG_LEVEL: str = get_env("LOG_LEVEL", "INFO" if not DEBUG else "DEBUG")

    # Database
    DATABASE_URL: Optional[str] = get_env("DATABASE_URL")

    # Redis
    REDIS_URL: Optional[str] = get_env("REDIS_URL", "redis://localhost:6379")

    # Auth Service
    AUTH_SERVICE_URL: Optional[str] = get_env("AUTH_SERVICE_URL", "http://localhost:8001")

    # JWT
    JWT_SECRET_KEY: str = get_env("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(get_env("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
