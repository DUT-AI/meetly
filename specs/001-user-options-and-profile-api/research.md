# Research & Architectural Decisions: User Options & Profile Detail API

## 1. Overview
The user requested refactoring user endpoints:
- Change generic `/users` list endpoint to `/users/option` returning a lightweight user list with only 4 fields: `id`, `name`, `email`, and `avatar_url`.
- Provide `/user/:id` (and alias `/users/:id` if appropriate) for detailed user profile retrieval returning a standardized response payload:
  `{ "is_success": true, "status_code": 200, "data": { ...detailed fields... }, "message": "Fetched user profile", "pagination": null }`.
- Update frontend calls (e.g. member selector dialog, API hooks) to use `/users/option` instead of `/users`.

## 2. Decisions & Technical Findings

### Decision 1: Endpoint Naming & Routing in FastAPI
- **Decision**: In `apps/api/routers/users.py`:
  - Route `GET /api/v1/users/option` (with router prefix `/api/v1/users` or `/users` if root level alias needed). Notice current router prefix in `apps/api/routers/users.py` is `prefix="/api/v1/users"`.
  - To support both `/api/v1/users/option` and frontend `/users/option` (or ensure Next.js API client baseURL matches `/api/v1`), provide endpoints:
    - `GET /option` under `prefix="/api/v1/users"` -> `/api/v1/users/option`
    - `GET /{user_id}` under `prefix="/api/v1/users"` -> `/api/v1/users/{user_id}`
    - Also register `/api/v1/user/{user_id}` (or top-level `/user/{id}`) if requested by client to adhere to `/user/:id`.
  - Maintain legacy `GET /api/v1/users` (deprecated) or alias it to ensure no other background services break unexpectedly.
- **Rationale**: FastAPI routers allow multiple route decorators or dedicated routes for `/user/{user_id}` and `/users/{user_id}`.
- **Alternatives considered**: Replacing `/api/v1/users` entirely. Breaking change could impact tests or legacy scripts. Adding `/option` and `/user/{id}` while keeping legacy endpoint safe or aliased is the cleanest approach.

### Decision 2: ManageClient & Data Transfer Objects
- **Decision**:
  - Add `UserOptionDTO` with fields: `id`, `name`, `email`, `avatar_url`.
  - Add `UserProfileDetailDTO` with full fields: `id`, `name`, `email`, `phone_number`, `status`, `role_ids`, `discord_id`, `avatar_url`, `zalo_bot_id`, `role_names`, `permissions`, `check_in_card_code_configured`.
  - Envelope response DTO: `UserProfileResponseDTO` with `is_success=True`, `status_code=200`, `data=UserProfileDetailDTO`, `message="Fetched user profile"`, `pagination=None`.
  - `ManageClient`:
    - Check if Manage Service has `/users/option` or if `ManageClient` maps upstream Manage API `users` to `UserOptionDTO`.
    - If Manage Service endpoint is `users`, `ManageClient` can call it and project to `UserOptionDTO` (or fetch from `/users/option` if remote supports it).
    - In `get_user(user_id)`, ManageClient calls upstream `GET {base}/users/{user_id}` which already returns the detailed user dict, then parses into `UserProfileDetailDTO` (or `ManageUserDTO`).
- **Rationale**: Keeps domain models decoupled from raw external HTTP responses while preserving type safety with Pydantic v2.

### Decision 3: Frontend Synchronization (`web`)
- **Decision**:
  - Update `web/src/features/members/api/use-get-users.ts`:
    - Update query endpoint from `/users` to `/users/option`.
    - Adjust returned type definition to `UserOption[]` (`id`, `name`, `email`, `avatar_url`).
    - Update components (e.g. `add-member-dialog.tsx`) to consume the new structure.
- **Rationale**: The UI only displays name, avatar, and email when picking members. It does not need permissions or role details in the select dropdown.
