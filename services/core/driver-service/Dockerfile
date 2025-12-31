# Dollor.ai Driver Service
# =========================
# Multi-stage build for optimized production image

# Stage 1: Build
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY ./core/driver-service/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

# Labels
LABEL org.opencontainers.image.title="Dollor.ai Driver Service"
LABEL org.opencontainers.image.description="Driver management service for delivery and rideshare"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Dollor.ai"

# Create non-root user
RUN groupadd -r dollor && useradd -r -g dollor dollor

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /home/dollor/.local

# Copy shared library
COPY --chown=dollor:dollor ./shared /app/shared

# Copy application
COPY --chown=dollor:dollor ./core/driver-service/main.py .

# Set environment
ENV PATH=/home/dollor/.local/bin:$PATH
ENV PYTHONPATH=/app:/app/shared
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER dollor

# Expose port
EXPOSE 8003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8003/health')" || exit 1

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
