# Stage 1: builder -- install all deps and build artifacts
# Default target for development (docker build .): uses last stage
# Production target: docker build --target production .
FROM python:3.11-slim AS builder

# Install Node.js for SuiteCloud CLI
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install SuiteCloud CLI globally
RUN npm install -g @oracle/suitecloud-cli --no-fund --no-audit --acceptsuitecloudsdklicense

WORKDIR /app

# Install Python dependencies into a virtualenv for clean copying
COPY src/backend/requirements.txt .
RUN python -m venv /app/venv \
    && /app/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy full backend (venv excluded via .dockerignore)
COPY src/backend/ .

RUN mkdir -p /app/data/vectorstore_ollama

EXPOSE 8000

CMD ["uvicorn", "rawapi:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]


# Stage 2: production -- runtime artifacts only, no test files
FROM python:3.11-slim AS production

# Install Node.js and SuiteCloud CLI (required at runtime for SDF deploy)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm install -g @oracle/suitecloud-cli --no-fund --no-audit --acceptsuitecloudsdklicense

WORKDIR /app

# Copy virtualenv from builder (all Python deps, no build tools)
COPY --from=builder /app/venv /app/venv

# Copy only runtime backend files -- exclude tests/ and dev scripts
COPY --from=builder /app/rawapi.py /app/rawapi.py
COPY --from=builder /app/routers/ /app/routers/
COPY --from=builder /app/models.py /app/models.py
COPY --from=builder /app/schemas.py /app/schemas.py
COPY --from=builder /app/database.py /app/database.py
COPY --from=builder /app/auth_utils.py /app/auth_utils.py
COPY --from=builder /app/audit_utils.py /app/audit_utils.py
COPY --from=builder /app/model_utils.py /app/model_utils.py
COPY --from=builder /app/email_utils.py /app/email_utils.py
COPY --from=builder /app/session_store.py /app/session_store.py
COPY --from=builder /app/suitescripts_utils.py /app/suitescripts_utils.py
COPY --from=builder /app/sdf_utils.py /app/sdf_utils.py
COPY --from=builder /app/middleware/ /app/middleware/
COPY --from=builder /app/webhook_worker.py /app/webhook_worker.py
COPY --from=builder /app/alembic.ini /app/alembic.ini
COPY --from=builder /app/alembic/ /app/alembic/
COPY --from=builder /app/data/ /app/data/
COPY --from=builder /app/scripts/rebuild_vectorstore.py /app/scripts/rebuild_vectorstore.py
COPY --from=builder /app/scripts/ingest_bootstrap.py /app/scripts/ingest_bootstrap.py
COPY --from=builder /app/scripts/test_retrieval.py /app/scripts/test_retrieval.py
COPY --from=builder /app/scripts/pull_customer_knowledge.py /app/scripts/pull_customer_knowledge.py

# Phase 19: bootstrap knowledge files (baked into image)
COPY --from=builder /app/knowledge/ /app/knowledge/

# Runtime data directories
RUN mkdir -p /app/data/vectorstore_ollama /app/data/customer_index /app/data/customer_knowledge

# Use virtualenv python for all commands
ENV PATH="/app/venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "rawapi:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
