# Dollor.ai Health Check Utilities
# =================================
# Common health check endpoint utilities

from datetime import datetime
from typing import Dict, Any, Optional
import os

def get_health_response(
    service_name: str,
    version: str = "1.0.0",
    extra_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a standard health check response.

    Args:
        service_name: Name of the service
        version: Service version
        extra_info: Optional additional information

    Returns:
        Health check response dictionary
    """
    response = {
        "status": "healthy",
        "service": service_name,
        "version": version,
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "unknown")
    }

    if extra_info:
        response.update(extra_info)

    return response

async def check_database_health(db_session) -> bool:
    """
    Check database connectivity.

    Args:
        db_session: Database session

    Returns:
        True if database is healthy, False otherwise
    """
    try:
        await db_session.execute("SELECT 1")
        return True
    except Exception:
        return False

async def check_redis_health(redis_client) -> bool:
    """
    Check Redis connectivity.

    Args:
        redis_client: Redis client instance

    Returns:
        True if Redis is healthy, False otherwise
    """
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False
