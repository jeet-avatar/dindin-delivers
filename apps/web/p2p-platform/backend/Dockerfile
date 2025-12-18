FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user for security (Semgrep: dockerfile.security.missing-user)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy application code
COPY . .

# Create uploads directory and set permissions
RUN mkdir -p uploads/driver_documents uploads/vendor_documents && \
    chown -R appuser:appgroup /app

# Expose port
EXPOSE 8080

# Switch to non-root user
USER appuser

# Run the application
CMD ["uvicorn", "main_new:app", "--host", "0.0.0.0", "--port", "8080"]
