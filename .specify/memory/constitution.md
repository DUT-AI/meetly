<!--
Sync Impact Report:
- Version change: Unversioned / Initial Template -> v1.0.0
- Modified principles: Replaced all [PRINCIPLE_*] placeholders with project-tailored principles for Meetly
- Added sections:
  - Core Principles: Modular Monolith (Dishka DI), Feature-Driven Frontend, Explicit Contract & DTO Boundaries, Async & Resilient Background Pipelines, Test-Driven & Verified Changes
  - Architectural Standards & Technical Stack
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: None (template generic placeholders instantiated)
- Follow-up TODOs: None
-->

# Meetly Constitution

## Core Principles

### I. Modular Monolith Architecture (Dishka DI)
Every backend capability MUST reside in its designated domain module under `modules/<domain>/` (`identity`, `members`, `workspaces`, `projects`, `tasks`, `meetings`, `notifications`, `transcription`). Cross-module dependencies MUST communicate via explicit service interfaces or dependency injection through Dishka container providers. Direct cross-module internal database model coupling without repository/service boundaries is prohibited.

### II. Feature-Driven Frontend Isolation
Frontend code in `web/` MUST follow the feature-based structure (`src/features/<feature>/`) incorporating components, hooks, api queries, and types. Shared UI primitives reside in `src/components/ui/`. Components MUST use TanStack Query v5 for server state, TailwindCSS + Radix UI for accessible interface components, and communicate with the backend via centralized clients (`@/lib/api.ts` for CSR, `@/lib/api-server.ts` for SSR).

### III. Explicit Contract & DTO Boundaries (NON-NEGOTIABLE)
All external service interactions (such as Manage Service) and internal API routes MUST define explicit, typed Pydantic DTOs in `modules/<domain>/dtos/`. Raw dictionaries MUST NOT be leaked across service, use case, or controller boundaries. Endpoints MUST follow standardized response schemas and HTTP error handling conventions without ad-hoc envelope variations.

### IV. Async & Resilient Background Pipelines
Heavy media operations (FFmpeg chunking, MinIO object storage, Gemini Multimodal transcription) and external channel dispatches (Zalo Bot, Discord webhooks) MUST run asynchronously and fail gracefully. Transient failures MUST log structured warnings without bringing down customer-facing HTTP requests.

### V. Test-Driven Verification & Quality Gates
Every endpoint, use case refactor, and pipeline change MUST be accompanied by automated unit or integration tests (`pytest` for backend, TypeScript compile validation `tsc --noEmit` and Jest/Playwright where applicable for frontend). No code change shall be considered complete without passing automated test execution.

## Architectural Standards & Technical Stack

- **Backend Stack**: Python 3.12, FastAPI, Dishka DI, SQLAlchemy 2.0 Async, Alembic, PostgreSQL, Redis, MinIO S3.
- **Frontend Stack**: Next.js 14 App Router, TypeScript (strict mode), TanStack Query v5, TailwindCSS, Radix UI.
- **Configuration**: Strictly environment-driven via Pydantic Settings (`pydantic-settings`). Hardcoded credentials or silent fallback URLs for critical external services are strictly prohibited.
- **Telemetry & Logging**: Structured logging via Loguru, standardized error exception hierarchies in `core/exceptions.py`.

## Development Workflow & Quality Gates

- **Orchestration**: End-to-end features and refactoring follow the Spec Kit and `cook` workflow (`spec.md` -> `plan.md` -> `tasks.md` -> implementation).
- **Static Verification**: `poetry run pytest` (backend) and `pnpm tsc --noEmit` / `pnpm lint` (frontend) MUST exit with 0 errors before merging.
- **Review Gates**: Architectural boundary additions or schema migrations require review of migration reversibility and backward compatibility.

## Governance

This Constitution represents the supreme design and quality contract for the Meetly repository. All pull requests, automated agent implementations, and architectural refactorings MUST adhere to these principles.
- Amendments to this constitution require justification, documented changes, and a semantic version bump.
- Major version increments indicate breaking changes to architecture or governance; minor increments indicate added guidelines; patch increments indicate clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12
