# Multi-stage Dockerfile for Meetly Discord Audio Extractor Bot

# ── 1. BUILD STAGE ─────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# ── 2. PRODUCTION RUNNER STAGE ─────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies (FFmpeg for audio downmixing)
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create temp storage directory
RUN mkdir -p /app/tmp && chown -R node:node /app

USER node

CMD ["node", "dist/index.js"]
