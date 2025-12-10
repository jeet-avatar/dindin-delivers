# EatFair P2P Backend - Production Dockerfile
# Optimized for AWS App Runner / Fargate

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port (App Runner uses 8080 by default)
EXPOSE ${PORT}

# Run with production settings
# - 4 workers for multi-core utilization
# - 120s timeout for long requests
# - Access log for monitoring
CMD ["sh", "-c", "uvicorn main_new:app --host 0.0.0.0 --port ${PORT} --workers 4 --timeout-keep-alive 120 --access-log"]
