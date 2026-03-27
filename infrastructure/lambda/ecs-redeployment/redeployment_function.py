"""
Dollor.ai — ECS Redeployment Lambda

Triggered by EventBridge when Secrets Manager emits an EndRotation notification
for a database secret (staging or production).

Force-redeploys the appropriate ECS service(s) so new tasks pick up the rotated
DATABASE_URL from AWSCURRENT.

Targets:
  - dollor-api-staging-service  (staging rotations)
  - dollor-api-service          (production rotations)
"""

import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_CLUSTER = "dollor-production"
_STAGING_SERVICE = "dollor-api-staging-service"
_PRODUCTION_SERVICE = "dollor-api-service"

# Map secret name prefixes to the services that should be redeployed
_SECRET_SERVICE_MAP = {
    "dollor/staging/": [(_CLUSTER, _STAGING_SERVICE)],
    "dollor/production/": [(_CLUSTER, _PRODUCTION_SERVICE)],
}


def _resolve_services(event):
    """Determine which ECS services to redeploy based on the rotated secret."""
    secret_id = event.get("detail", {}).get("secretId", "")
    for prefix, services in _SECRET_SERVICE_MAP.items():
        if prefix in secret_id:
            return services
    # Fallback: redeploy all services if secret cannot be matched
    logger.warning("Could not match secret '%s' to environment — redeploying all services", secret_id)
    return [(_CLUSTER, _STAGING_SERVICE), (_CLUSTER, _PRODUCTION_SERVICE)]


def lambda_handler(event, context):
    """Force redeploy ECS service(s) after DB password rotation."""
    ecs = boto3.client("ecs", region_name="us-east-1")

    services_to_redeploy = _resolve_services(event)

    for cluster, service in services_to_redeploy:
        logger.info("Redeploying ECS service cluster=%s service=%s", cluster, service)
        response = ecs.update_service(
            cluster=cluster,
            service=service,
            forceNewDeployment=True,
        )
        http_status = response["ResponseMetadata"]["HTTPStatusCode"]
        logger.info(
            "ECS update_service response: cluster=%s service=%s status=%s",
            cluster,
            service,
            http_status,
        )

    logger.info("Redeployment trigger complete for %d service(s)", len(services_to_redeploy))
