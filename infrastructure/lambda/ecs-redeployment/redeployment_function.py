"""
Dollor.ai — ECS Redeployment Lambda

Triggered by EventBridge when Secrets Manager emits an EndRotation notification
for the staging secret (dollor/staging/database-url).

Force-redeploys the staging ECS service so new tasks pick up the rotated
DATABASE_URL from AWSCURRENT.

Production service redeployment is added in plan 08-02.
"""

import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_CLUSTER = "dollor-production"
_STAGING_SERVICE = "dollor-api-staging-service"


def lambda_handler(event, context):
    """Force redeploy ECS staging service after DB password rotation."""
    ecs = boto3.client("ecs", region_name="us-east-1")

    services_to_redeploy = [
        (_CLUSTER, _STAGING_SERVICE),
    ]

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
