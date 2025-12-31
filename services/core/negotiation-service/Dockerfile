# Dollor.ai Negotiation Service
# ==============================
# Matchmaking platform for price negotiation between independent parties

FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY core/negotiation-service/requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Production stage
FROM python:3.12-slim

# Labels
LABEL org.opencontainers.image.title="Dollor.ai Negotiation Service"
LABEL org.opencontainers.image.description="Matchmaking platform for price negotiation"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Dollor.ai"
LABEL com.dollor.service.model="MATCHMAKING_PLATFORM"

# Create non-root user
RUN groupadd -r dollor && useradd -r -g dollor dollor

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels and install
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy shared library
COPY shared /app/shared

# Copy application
COPY --chown=dollor:dollor core/negotiation-service/main.py .

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/shared
ENV SERVICE_NAME=negotiation-service
ENV SERVICE_PORT=8017

# Switch to non-root
USER dollor

# Expose port
EXPOSE 8017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8017/health || exit 1

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8017"]
