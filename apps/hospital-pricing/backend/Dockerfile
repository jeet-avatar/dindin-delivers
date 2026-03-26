# ── Base ──────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System deps for psycopg2-binary, pdfplumber, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ── API target ────────────────────────────────────────────────────────────────
FROM base AS api

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

# ── Worker target ─────────────────────────────────────────────────────────────
FROM base AS worker

CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info", "--concurrency=2"]
