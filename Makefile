FRONTEND_DIR=web
.PHONY: help dev-api dev-web dev-worker docker-up docker-down migrate create-migration test ruff check lint

help:
	@echo "Available commands:"
	@echo "  make dev-api        - Start local FastAPI server (uvicorn)"
	@echo "  make dev-worker     - Start background task worker"
	@echo "  make dev-web        - Start frontend dev server (Next.js)"
	@echo "  make docker-up      - Start full stack in background with Docker Compose"
	@echo "  make docker-down    - Stop and remove Docker Compose containers"
	@echo "  make migrate        - Run database migrations (alembic upgrade head)"
	@echo "  make create-migration DESC=\"msg\" - Create a new migration revision"
	@echo "  make test           - Run backend test suite"
	@echo "  make ruff           - Format and fix python code with ruff"
	@echo "  make check          - Run static type checking (mypy)"
	@echo "  make lint           - Run formatting, linting, and checks"

dev-api:
	uv run uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload

api-dev: dev-api

dev-worker:
	uv run python apps/worker/main.py

dev-web:
	cd ./$(FRONTEND_DIR) && pnpm dev

docker-up:
	docker compose up -d

docker-down:
	docker compose down

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
