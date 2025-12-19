FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY ./core/restaurant-auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared library
COPY ./shared /app/shared

# Copy application code
COPY ./core/restaurant-auth-service/main.py .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app:/app/shared
ENV SERVICE_NAME=restaurant-auth-service
ENV SERVICE_PORT=8010

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8010/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
