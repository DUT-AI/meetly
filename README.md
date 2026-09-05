# Meetly - Workspace & Task Management Platform

Fullstack task and workspace management platform inspired by Jira, refactored into a decoupled, modular architecture mirroring the standards of `dut-ai-data-platform`.

## Architecture Overview

- **Backend**: Modular Monolith in Python (`core/`, `modules/`, `apps/`, `migrations/`)
  - **Framework**: FastAPI + Uvicorn
  - **Dependency Injection**: Dishka (request-scoped, async providers)
  - **Database & ORM**: PostgreSQL + SQLAlchemy 2.0 (Async) + Alembic
  - **Storage**: MinIO (S3-compatible object storage)
  - **Cache & Message Broker**: Redis 7
  - **Domain Modules**:
    - `modules/identity`: External Auth & Manage server integration, local login metadata tracking, platform JWT cookie authentication
    - `modules/workspaces`: Workspace lifecycle, member invitations, and analytics
    - `modules/members`: Workspace role permissions and team management
    - `modules/projects`: Projects and per-project analytics
    - `modules/tasks`: Tasks, kanban board, bulk positional updates
  - **Applications**:
    - `apps/api`: REST API gateway with versioned endpoints (`/api/v1/...`)
    - `apps/worker`: Background task worker

- **Frontend**: Next.js 14 App Router (`web/`)
  - **State & Server Queries**: TanStack React Query v5
  - **HTTP Clients**: Axios (`@/lib/api.ts` for client with HttpOnly cookies), `serverFetch` (`@/lib/api-server.ts` for Next.js SSR/Server Components)
  - **UI & Styling**: TailwindCSS + Radix UI + Lucide Icons + Sonner + Nuqs
  - **Features**: `features/auth`, `features/workspaces`, `features/projects`, `features/members`, `features/tasks`

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

### 2. Run with Docker Compose

Start all services (Postgres, Redis, MinIO, API, Worker, Web):
```bash
make docker-up
```

Stop services:
```bash
make docker-down
```

### 3. Local Development

Start backend API:
```bash
make dev-api
```

Start frontend:
```bash
make dev-web
```

Run database migrations:
```bash
make migrate
```
