FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g tsx

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm install --production --ignore-scripts

COPY server/index.ts ./server/
COPY server/db.ts server/auth.ts server/email.ts server/ical.ts server/slugs.ts server/crypto.ts ./server/
COPY server/migrations/ ./server/migrations/
COPY server/routes/ ./server/routes/
COPY server/middleware/ ./server/middleware/
COPY server/calendar/ ./server/calendar/
COPY server/services/ ./server/services/
COPY frontend/dist ./frontend/dist

EXPOSE 3001
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

WORKDIR /app/server
CMD ["tsx", "index.ts"]
