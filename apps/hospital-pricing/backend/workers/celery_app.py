# apps/hospital-pricing/backend/workers/celery_app.py
from celery import Celery
from config import settings

celery_app = Celery(
    "hospital_pricing",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)
