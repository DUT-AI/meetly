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

# Install runtime dependencies:
# - ffmpeg: Xử lý mix/encode audio stream
# - dumb-init: Quản lý PID 1 và chuyển tiếp signals (SIGTERM/SIGINT) dọn dẹp tiến trình con FFmpeg
# - libc6-compat: Tương thích C++ bindings trên Alpine
RUN apk add --no-cache ffmpeg dumb-init libc6-compat

ENV NODE_ENV=production

COPY package*.json ./
# Dùng --omit=dev thay thế cho --only=production đã deprecated
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

# Tạo thư mục temp cho audio processing và phân quyền cho user node
RUN mkdir -p /app/tmp && chown -R node:node /app

USER node

# Sử dụng dumb-init để bọc process node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
