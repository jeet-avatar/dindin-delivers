# Dollor.ai Chat Service
# ======================
# Real-time messaging between independent parties

FROM python:3.12-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

FROM python:3.12-slim

LABEL org.opencontainers.image.title="Dollor.ai Chat Service"
LABEL org.opencontainers.image.description="Real-time messaging for matchmaking platform"
LABEL org.opencontainers.image.version="1.0.0"

RUN groupadd -r dollor && useradd -r -g dollor dollor

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

COPY --chown=dollor:dollor main.py .

ENV PYTHONUNBUFFERED=1
ENV SERVICE_NAME=chat-service
ENV SERVICE_PORT=8018

USER dollor

EXPOSE 8018

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8018/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8018"]
