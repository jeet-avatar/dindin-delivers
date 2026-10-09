FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc curl ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-reference.txt ./
RUN pip install --no-cache-dir torch==2.6.0+cpu torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements-reference.txt

# Ship weights in the image; user requests must not trigger model downloads.
# Override at build time for higher quality, e.g. --build-arg DEMUCS_MODEL=htdemucs_ft
ARG DEMUCS_MODEL=htdemucs
ENV TORCH_HOME=/opt/beatmind-models
RUN python -c "from demucs.pretrained import get_model; get_model('${DEMUCS_MODEL}')" \
    && chmod -R a+rX /opt/beatmind-models

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
ENV BEATMIND_REFERENCES_DIR=/data/references
ENV BEATMIND_CHATS_DIR=/data/chats
ENV BEATMIND_REFERENCE_ENABLED=1
ENV BEATMIND_REQUIRE_CACHED_MODEL=1
ENV NUMBA_CACHE_DIR=/tmp/beatmind-numba
ENV OMP_NUM_THREADS=2

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
