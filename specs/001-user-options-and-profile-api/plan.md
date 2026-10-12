# Implementation Plan: User Options and Profile Detail API

**Branch**: `001-user-options-and-profile-api` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-user-options-and-profile-api/spec.md`

## Summary
Refactor the user endpoints:
1. Provide `GET /api/v1/users/option` returning a lightweight list of users with only 4 fields: `id`, `name`, `email`, and `avatar_url`.
2. Provide `GET /api/v1/users/{id}` returning the complete user profile in an envelope format `{ is_success: true, status_code: 200, data: {...}, message: "Fetched user profile", pagination: null }`.
3. Update `web/src/features/members/api/use-get-users.ts` and related components to call `/users/option` (which resolves to `/api/v1/users/option`) and handle the new format.

## Technical Context

**Language/Version**: Python 3.11+, TypeScript 5+ (Next.js 14 App Router)

**Primary Dependencies**: FastAPI, Pydantic v2, Dishka, HTTPX, Redis, TanStack Query v5

**Storage**: Redis for caching user lists and profiles, PostgreSQL for local metadata

**Testing**: Pytest for backend unit/integration tests

**Target Platform**: Linux / macOS server, Web Browser

**Project Type**: Web Service (Modular Monolith + Next.js web application)

**Performance Goals**: <150ms response time for user option list

**Constraints**: Backward compatibility for internal callers; strict 4-field projection for options endpoint

**Scale/Scope**: ~1k system users, fast UI select dropdowns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Modular Monolith design respected (`modules/identity/`, `apps/api/routers/users.py`)
- [x] Clean architecture & Dishka DI preserved
- [x] Type safety ensured with Pydantic v2 schemas and TypeScript interfaces
- [x] No breaking architectural changes; only endpoint refinement

## Project Structure

### Documentation (this feature)

```text
specs/001-user-options-and-profile-api/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 decisions & findings
├── data-model.md        # Phase 1 DTO definitions
├── quickstart.md        # Phase 1 validation instructions
├── contracts/           # Phase 1 API specifications
│   └── user_api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/api/
├── routers/
│   └── users.py                       # Expose GET /users/option and GET /user/{id}
modules/identity/
├── client/
│   └── manage_client.py               # ManageClient option listing & detailed fetching
├── dtos/
│   ├── user_dtos.py                   # UserOptionDTO, UserProfileResponseDTO
│   └── manage_dtos.py                 # ManageUserDetailDTO
└── use_cases/
    ├── get_user_options.py            # Use case for lightweight options
    └── get_user_profile.py            # Use case for full profile envelope
web/src/features/members/
├── api/
│   └── use-get-users.ts               # Point to /users/option
└── components/
    └── add-member-dialog.tsx          # Member addition dialog UI
```

**Structure Decision**: Modular monolith backend changes inside `modules/identity/` and `apps/api/routers/users.py`, alongside feature-based web client updates in `web/src/features/members/`.

## Complexity Tracking

No constitution violations detected. Standard endpoint refactoring and DTO additions.
