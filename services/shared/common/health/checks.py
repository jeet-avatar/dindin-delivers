"""
Dollor.ai - Health Check Endpoints
==================================

Provides standardized health check endpoints for Kubernetes:
- /health: General health check (liveness probe)
- /ready: Readiness check with dependency validation
- /live: Simple liveness check

All endpoints return standardized JSON responses.
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse


class HealthStatus(str, Enum):
    """Health check status."""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


@dataclass
class DependencyCheck:
    """Configuration for a dependency health check."""
    name: str
    check_fn: Callable[[], Any]  # Function to check dependency health
    required: bool = True  # If True, failure makes service unhealthy
    timeout: float = 5.0  # Timeout in seconds


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    status: HealthStatus
    service: str
    version: str
    environment: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    uptime_seconds: float = 0
    dependencies: Dict[str, Dict] = field(default_factory=dict)
    details: Dict[str, Any] = field(default_factory=dict)


class HealthChecker:
    """
    Health checker for microservices.

    Usage:
        health_checker = HealthChecker(
            service_name="order-service",
            version="1.0.0",
            environment="staging"
        )

        # Add dependency checks
        health_checker.add_dependency("postgres", check_postgres, required=True)
        health_checker.add_dependency("redis", check_redis, required=False)

        # Get FastAPI router
        app.include_router(health_checker.router)
    """

    def __init__(
        self,
        service_name: str,
        version: str = "1.0.0",
        environment: str = "development"
    ):
        self.service_name = service_name
        self.version = version
        self.environment = environment
        self.start_time = datetime.utcnow()
        self.dependencies: List[DependencyCheck] = []
        self.router = self._create_router()

    def add_dependency(
        self,
        name: str,
        check_fn: Callable,
        required: bool = True,
        timeout: float = 5.0
    ):
        """
        Add a dependency health check.

        Args:
            name: Name of the dependency (e.g., "postgres", "redis")
            check_fn: Async or sync function that returns True if healthy
            required: If True, failure marks service as unhealthy
            timeout: Timeout for the check in seconds
        """
        self.dependencies.append(DependencyCheck(
            name=name,
            check_fn=check_fn,
            required=required,
            timeout=timeout
        ))

    def _create_router(self) -> APIRouter:
        """Create FastAPI router with health endpoints."""
        router = APIRouter(tags=["Health"])

        @router.get("/health", response_model=None)
        async def health_check():
            """
            General health check endpoint.
            Used for Kubernetes liveness probe.
            """
            result = await self._check_health(check_dependencies=True)
            status_code = 200 if result.status != HealthStatus.UNHEALTHY else 503
            return JSONResponse(content=self._result_to_dict(result), status_code=status_code)

        @router.get("/ready", response_model=None)
        async def readiness_check():
            """
            Readiness check endpoint.
            Used for Kubernetes readiness probe.
            Checks all dependencies before marking as ready.
            """
            result = await self._check_health(check_dependencies=True)
            status_code = 200 if result.status == HealthStatus.HEALTHY else 503
            return JSONResponse(content=self._result_to_dict(result), status_code=status_code)

        @router.get("/live", response_model=None)
        async def liveness_check():
            """
            Simple liveness check endpoint.
            Used for basic "is the service running" checks.
            Does not check dependencies.
            """
            result = await self._check_health(check_dependencies=False)
            return JSONResponse(content=self._result_to_dict(result), status_code=200)

        return router

    async def _check_health(self, check_dependencies: bool = True) -> HealthCheckResult:
        """Perform health check."""
        uptime = (datetime.utcnow() - self.start_time).total_seconds()

        result = HealthCheckResult(
            status=HealthStatus.HEALTHY,
            service=self.service_name,
            version=self.version,
            environment=self.environment,
            uptime_seconds=round(uptime, 2)
        )

        if check_dependencies and self.dependencies:
            dependency_results = await self._check_dependencies()
            result.dependencies = dependency_results

            # Determine overall status based on dependency results
            has_required_failure = False
            has_any_failure = False

            for name, dep_result in dependency_results.items():
                if dep_result["status"] != "healthy":
                    has_any_failure = True
                    # Find if this dependency is required
                    dep_config = next((d for d in self.dependencies if d.name == name), None)
                    if dep_config and dep_config.required:
                        has_required_failure = True

            if has_required_failure:
                result.status = HealthStatus.UNHEALTHY
            elif has_any_failure:
                result.status = HealthStatus.DEGRADED

        return result

    async def _check_dependencies(self) -> Dict[str, Dict]:
        """Check all dependencies concurrently."""
        results = {}

        async def check_single(dep: DependencyCheck) -> tuple:
            start_time = datetime.utcnow()
            try:
                # Run check with timeout
                check = dep.check_fn()
                if asyncio.iscoroutine(check):
                    await asyncio.wait_for(check, timeout=dep.timeout)
                else:
                    # For sync functions, run in executor
                    loop = asyncio.get_event_loop()
                    await asyncio.wait_for(
                        loop.run_in_executor(None, check),
                        timeout=dep.timeout
                    )

                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                return dep.name, {
                    "status": "healthy",
                    "latency_ms": round(duration, 2),
                    "required": dep.required
                }

            except asyncio.TimeoutError:
                duration = dep.timeout * 1000
                return dep.name, {
                    "status": "unhealthy",
                    "error": "timeout",
                    "latency_ms": round(duration, 2),
                    "required": dep.required
                }

            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                return dep.name, {
                    "status": "unhealthy",
                    "error": str(e),
                    "latency_ms": round(duration, 2),
                    "required": dep.required
                }

        # Run all checks concurrently
        tasks = [check_single(dep) for dep in self.dependencies]
        check_results = await asyncio.gather(*tasks)

        for name, result in check_results:
            results[name] = result

        return results

    def _result_to_dict(self, result: HealthCheckResult) -> dict:
        """Convert HealthCheckResult to dictionary."""
        return {
            "status": result.status.value,
            "service": result.service,
            "version": result.version,
            "environment": result.environment,
            "timestamp": result.timestamp,
            "uptime_seconds": result.uptime_seconds,
            "dependencies": result.dependencies if result.dependencies else None,
            "details": result.details if result.details else None
        }


# =============================================================================
# COMMON DEPENDENCY CHECK FUNCTIONS
# =============================================================================

def create_postgres_check(connection_string: str) -> Callable:
    """
    Create a PostgreSQL health check function.

    Usage:
        postgres_check = create_postgres_check("postgresql://...")
        health_checker.add_dependency("postgres", postgres_check)
    """
    async def check():
        import asyncpg
        conn = await asyncpg.connect(connection_string)
        try:
            await conn.fetchval("SELECT 1")
        finally:
            await conn.close()

    return check


def create_redis_check(redis_url: str) -> Callable:
    """
    Create a Redis health check function.

    Usage:
        redis_check = create_redis_check("redis://localhost:6379")
        health_checker.add_dependency("redis", redis_check)
    """
    async def check():
        import redis.asyncio as redis
        r = redis.from_url(redis_url)
        try:
            await r.ping()
        finally:
            await r.close()

    return check


def create_http_check(url: str, timeout: float = 5.0) -> Callable:
    """
    Create an HTTP health check function for external services.

    Usage:
        api_check = create_http_check("https://api.stripe.com/v1/health")
        health_checker.add_dependency("stripe", api_check, required=False)
    """
    async def check():
        import httpx
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            response.raise_for_status()

    return check


def create_rabbitmq_check(amqp_url: str) -> Callable:
    """
    Create a RabbitMQ health check function.

    Usage:
        rabbitmq_check = create_rabbitmq_check("amqp://guest:guest@localhost/")
        health_checker.add_dependency("rabbitmq", rabbitmq_check)
    """
    async def check():
        import aio_pika
        connection = await aio_pika.connect_robust(amqp_url)
        try:
            channel = await connection.channel()
            await channel.close()
        finally:
            await connection.close()

    return check


def create_elasticsearch_check(es_url: str) -> Callable:
    """
    Create an Elasticsearch health check function.

    Usage:
        es_check = create_elasticsearch_check("http://localhost:9200")
        health_checker.add_dependency("elasticsearch", es_check, required=False)
    """
    async def check():
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{es_url}/_cluster/health")
            response.raise_for_status()
            data = response.json()
            if data["status"] == "red":
                raise Exception("Elasticsearch cluster status is red")

    return check
