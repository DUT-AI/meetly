# =============================================================================
# Optimized Dockerfile for AI Microservice (Whisper & NLLB CTranslate2)
# Context: Root workspace directory (.)
# =============================================================================

FROM python:3.12-slim

WORKDIR /app

ENV TZ=Asia/Ho_Chi_Minh \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH="/app" \
    PATH="/app/.venv/bin:$PATH" \
    SEAMLESS_DEVICE="cuda" \
    SEAMLESS_DTYPE="float16" \
    SEAMLESS_MODEL_ID="JustFrederik/nllb-200-distilled-600M-ct2-float16" \
    WHISPER_DEVICE="cuda" \
    WHISPER_COMPUTE_TYPE="float16" \
    UV_LINK_MODE="copy"

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependencies manifest
COPY pyproject.toml uv.lock* README.md* ./

# Install dependencies with extra AI and immediately clear cache to save disk space
RUN uv sync --frozen --no-dev --extra ai --no-install-project \
    && uv cache clean \
    && rm -rf /root/.cache

# Copy source code
COPY core ./core
COPY modules ./modules
COPY apps ./apps

EXPOSE 8005

CMD ["uvicorn", "--app-dir", "apps/ai-service", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
