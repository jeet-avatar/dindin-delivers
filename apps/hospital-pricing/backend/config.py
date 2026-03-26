# apps/hospital-pricing/backend/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/hospital_pricing"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/hospital_pricing"
    redis_url: str = "redis://localhost:6379/0"
    s3_bucket: str = "hospital-pricing-documents"
    aws_region: str = "us-east-1"
    openai_api_key: str = "sk-placeholder"
    jwt_secret_key: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 480
    jwt_refresh_expire_days: int = 30
    environment: str = "development"

settings = Settings()
