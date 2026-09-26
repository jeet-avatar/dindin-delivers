FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd -g 1000 appgroup && useradd -u 1000 -g appgroup appuser

COPY . .

RUN mkdir -p /data && chown -R appuser:appgroup /app /data

EXPOSE 8000

USER appuser

# NOTE: ECS task def may override DB_PATH if needed
ENV DB_PATH=/data/beatmind.db
ENV BEATMIND_RECORDINGS_DIR=/data/recordings
ENV BEATMIND_PLANS_DIR=/data/production-plans
ENV BEATMIND_SECTIONS_DIR=/data/section-briefs

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
