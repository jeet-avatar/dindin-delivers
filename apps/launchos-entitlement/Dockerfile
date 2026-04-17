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

# Use the built-in non-root 'node' user from node:alpine
# (node:alpine already ships uid/gid 1000 as 'node', creating new group fails)
RUN chown -R node:node /app
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
