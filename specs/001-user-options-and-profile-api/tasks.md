# Tasks: User Options and Profile Detail API

**Input**: Design documents from `specs/001-user-options-and-profile-api/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/user_api.md](./contracts/user_api.md)

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3])
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare DTO structures and client types for user endpoints

- [x] T001 [P] Define `UserOptionDTO` projection model (with fields `id`, `name`, `email`, `avatar_url`) in `modules/identity/dtos/user_dtos.py`
- [x] T002 [P] Define `UserProfileDetailDTO` and `UserProfileEnvelopeDTO` in `modules/identity/dtos/user_dtos.py`

---

## Phase 2: Foundational (Client & Core Methods)

**Purpose**: Implement retrieval methods in `ManageClient` with Redis caching

- [x] T003 Implement `list_user_options` method in `modules/identity/client/manage_client.py` returning list of `UserOptionDTO` with Redis caching
- [x] T004 Enhance `get_user_profile` method in `modules/identity/client/manage_client.py` to return full profile details matching the envelope schema

---

## Phase 3: User Story 1 - Retrieve Lightweight User Options (Priority: P1) 🎯 MVP

**Goal**: Expose `GET /api/v1/users/option` returning a lightweight list of users with only 4 fields (`id`, `name`, `email`, `avatar_url`).

**Independent Test**: `curl -X GET "http://localhost:8000/api/v1/users/option"` returns an array of objects having only `id`, `name`, `email`, `avatar_url`.

### Implementation for User Story 1
- [x] T005 [US1] Create `GetUserOptionsUseCase` in `modules/identity/use_cases/get_user_options.py` to coordinate option retrieval and filtering
- [x] T006 [US1] Register `GetUserOptionsUseCase` into Dishka container in `modules/identity/di.py`
- [x] T007 [US1] Implement endpoint `GET /option` in `apps/api/routers/users.py` (resolves to `GET /api/v1/users/option`) returning `list[UserOptionDTO]`

**Checkpoint**: User Story 1 is functional and testable independently.

---

## Phase 4: User Story 2 - Fetch Detailed User Profile by ID (Priority: P2)

**Goal**: Expose `GET /api/v1/users/{id}` returning full user profile details inside the envelope format.

**Independent Test**: `curl -X GET "http://localhost:8000/api/v1/users/{id}"` returns `{ "is_success": true, "status_code": 200, "data": { ... }, "message": "Fetched user profile", "pagination": null }`.

### Implementation for User Story 2
- [x] T008 [US2] Create `GetUserProfileUseCase` in `modules/identity/use_cases/get_user_profile.py` returning `UserProfileEnvelopeDTO`
- [x] T009 [US2] Register `GetUserProfileUseCase` into Dishka container in `modules/identity/di.py`
- [x] T010 [US2] Implement endpoint `GET /{id}` in `apps/api/routers/users.py` (resolves to `GET /api/v1/users/{id}`) returning `UserProfileEnvelopeDTO`

**Checkpoint**: User Stories 1 & 2 are functional and verifiable independently.

---

## Phase 5: User Story 3 - Frontend UI Integration (Priority: P3)

**Goal**: Update frontend user search and member selection to consume `/api/v1/users/option` seamlessly.

**Independent Test**: Open the workspace Add Member dialog, type a search keyword, and verify users display name, avatar, and email without errors.

### Implementation for User Story 3
- [x] T011 [P] [US3] Update `web/src/features/members/api/use-get-users.ts` to call `/users/option` and update `SystemUser` type definition to match option payload
- [x] T012 [US3] Verify and adjust `web/src/features/members/components/add-member-dialog.tsx` to ensure member addition works seamlessly with new payload structure

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Clean up tests and execute validation scenarios

- [x] T013 Update or add backend test cases for `/api/v1/users/option` and `/api/v1/users/{id}` in `tests/modules/identity/test_users_api.py`
- [x] T014 Execute quickstart validation as described in `specs/001-user-options-and-profile-api/quickstart.md`

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** -> **Phase 2 (Foundational)** -> **Phase 3 (US1 - MVP)** -> **Phase 4 (US2)** -> **Phase 5 (US3 - Frontend)** -> **Phase 6 (Polish)**
- US1 (`/api/v1/users/option`) and US2 (`/api/v1/users/{id}`) share the common DTO and ManageClient setup in Phases 1 & 2.
- Frontend US3 depends on backend endpoint US1 being available.

---

## Implementation Strategy

### MVP First (User Story 1)
1. Complete T001 - T007.
2. Test `GET /api/v1/users/option` to verify 4 fields only.
3. Proceed to User Story 2 (T008 - T010) and Frontend User Story 3 (T011 - T012).
