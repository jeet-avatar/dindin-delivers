# =============================================================
# LaunchOS Entitlement Service — Multi-stage Docker build
# node:20-alpine for minimal image size
# =============================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package.json package-lock.json* ./
RUN npm ci --quiet

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --quiet

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -D appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
