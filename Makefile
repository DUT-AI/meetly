.PHONY: help dev-api dev-ai dev-web dev-worker dev-mobile docker-up docker-down docker-ai-up docker-ai-down migrate docker-migrate create-migration test ruff check lint

help:
	@echo "Available commands:"
	@echo "  make dev-api        - Start local FastAPI server (uvicorn)"
	@echo "  make dev-ai         - Start AI microservice (apps/ai-service/app/main.py)"
	@echo "  make dev-worker     - Start background task worker"
	@echo "  make dev-web        - Start frontend dev server (Next.js)"
	@echo "  make dev-mobile     - Start Flutter web dev server"
	@echo "  make docker-up      - Start full stack in background with Docker Compose"
	@echo "  make docker-down    - Stop and remove Docker Compose containers"
	@echo "  make docker-ai-up   - Start AI microservice container with Docker Compose"
	@echo "  make docker-ai-down - Stop AI microservice container"
	@echo "  make migrate        - Run database migrations (alembic upgrade head)"
	@echo "  make create-migration DESC=\"msg\" - Create a new migration revision"
	@echo "  make test           - Run backend test suite"
	@echo "  make ruff           - Format and fix python code with ruff"
	@echo "  make check          - Run static type checking (mypy)"
	@echo "  make lint           - Run formatting, linting, and checks"

dev-api:
	uv run uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload

api-dev: dev-api

dev-ai:
	PYTHONPATH=. uv run --extra ai uvicorn --app-dir apps/ai-service app.main:app --host 0.0.0.0 --port 8005 --reload

ai-dev: dev-ai

dev-worker:
	uv run python apps/worker/main.py

dev-web:
	cd ./web && pnpm dev

dev-mobile:
	cd ./mobile && flutter run -d web-server --web-port 8085 --web-hostname 0.0.0.0 --dart-define=API_BASE_URL=http://127.0.0.1:8888

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-ai-up:
	docker compose up -d --build ai-service

docker-ai-down:
	docker compose stop ai-service && docker compose rm -f ai-service

migrate:
	uv run alembic upgrade head

docker-migrate:
	docker compose exec api alembic upgrade head

create-migration:
	@if [ -z "$(DESC)" ]; then echo "Error: Please specify DESC, e.g., make create-migration DESC=\"add new table\""; exit 1; fi
	uv run alembic revision --autogenerate -m "$(DESC)"

test:
	uv run pytest tests/

ruff:
	uv run ruff format .
	uv run ruff check --fix .

check:
	uv run mypy core modules apps

lint: ruff check
