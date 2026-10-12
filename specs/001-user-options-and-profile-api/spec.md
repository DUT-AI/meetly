# Feature Specification: User Options and Profile Detail API

**Feature Branch**: `001-user-options-and-profile-api`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Hiện tại api get users chỉ /users => đổi thành /users/option và trả về danh sách như thế này chỉ có 4 trường này: id, name, email, avatar_url. Nếu cần chi tiết thêm về user thì sẽ dùng api /user/:id sẽ trả về chi tiết profile (is_success, status_code, data với đầy đủ fields, message, pagination: null). Hãy chỉnh sửa lại source code cho đúng."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve Lightweight User Options for Selection (Priority: P1)

As a frontend client or user selecting members (e.g. adding workspace members, assigning tasks), I want to fetch a lightweight list of users via `/api/v1/users/option` containing only essential identification fields (`id`, `name`, `email`, `avatar_url`) so that dropdowns and search inputs load rapidly with minimal payload overhead.

**Why this priority**: Core requirement of the feature. Prevents unnecessary data transfer when only selection metadata is needed across UI selectors.

**Independent Test**: Send a GET request to `/api/v1/users/option` and verify that the response contains a list of user objects containing only `id`, `name`, `email`, and `avatar_url`.

**Acceptance Scenarios**:

1. **Given** an authenticated user or client requesting user options, **When** requesting `GET /api/v1/users/option`, **Then** the system returns a status of 200 with a list of users where each record contains exactly `id`, `name`, `email`, and `avatar_url`.
2. **Given** optional search query parameters (e.g., query string `search`), **When** requesting `GET /api/v1/users/option?search=Huynh`, **Then** only matching users are returned with the same 4-field schema.

---

### User Story 2 - Fetch Detailed User Profile by ID (Priority: P2)

As an application client or administrator needing comprehensive user attributes (permissions, roles, contact info, external integration IDs), I want to request `GET /api/v1/users/{id}` so that full user profile details are returned in a standard envelope format.

**Why this priority**: Complements Story 1 by providing on-demand rich user profile information without burdening the general user options endpoint.

**Independent Test**: Request a single user's detail by ID via `GET /api/v1/users/{id}` and verify that the response matches the envelope schema with full data attributes (`name`, `email`, `phone_number`, `status`, `role_ids`, `discord_id`, `id`, `avatar_url`, `zalo_bot_id`, `role_names`, `permissions`, `check_in_card_code_configured`).

**Acceptance Scenarios**:

1. **Given** a valid existing user ID, **When** requesting `GET /api/v1/users/{id}`, **Then** the system returns 200 with `{ "is_success": true, "status_code": 200, "data": { ... }, "message": "Fetched user profile", "pagination": null }`.
2. **Given** a non-existent user ID, **When** requesting user detail by ID via `GET /api/v1/users/{id}`, **Then** the system returns a 404 Not Found error with a clear error message.

---

### User Story 3 - Frontend UI Integration with the New Option Endpoint (Priority: P3)

As a frontend user in Meetly using member pickers or the add-member dialog, I want the UI queries to consume `/api/v1/users/option` seamlessly without broken layouts or missing avatar/name information.

**Why this priority**: Ensures end-to-end functionality across web application features depending on user listings.

**Independent Test**: Open the workspace Add Member dialog, type a query, and verify that user suggestions populate correctly with avatar, name, and email.

**Acceptance Scenarios**:

1. **Given** the workspace member addition dialog, **When** opening the dialog or typing in the search box, **Then** client queries call `/api/v1/users/option` (or `/users/option` via baseURL) and display user search results accurately.

---

### Edge Cases

- What happens when a user record has no avatar (`avatar_url` is null)? The system returns `avatar_url: null` without breaking schemas.
- What happens when external identity/manage provider is temporarily unreachable? The system gracefully returns appropriate error responses (or leverages cached user records where applicable).
- What happens when requested user ID format is numeric vs string? Both integer and string ID lookups are handled consistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint at `GET /api/v1/users/option` to return user selection options.
- **FR-002**: The `GET /api/v1/users/option` endpoint MUST return records containing only `id`, `name`, `email`, and `avatar_url`.
- **FR-003**: System MUST support retrieving full user profile details by identifier via `GET /api/v1/users/{id}`.
- **FR-004**: The user detail endpoint response MUST follow the standardized envelope schema containing `is_success`, `status_code`, `data`, `message`, and `pagination`.
- **FR-005**: The `data` field of the user detail endpoint MUST include detailed attributes: `id`, `name`, `email`, `phone_number`, `status`, `role_ids`, `discord_id`, `avatar_url`, `zalo_bot_id`, `role_names`, `permissions`, and `check_in_card_code_configured`.
- **FR-006**: Frontend user fetching hooks and dialogs MUST be updated to consume `/users/option` (or `/api/v1/users/option`) instead of the legacy `/users` endpoint.

### Key Entities *(include if feature involves data)*

- **UserOption**: Lightweight projection containing `id`, `name`, `email`, and `avatar_url`.
- **UserProfileDetail**: Detailed user model containing identity, external platform links (Discord, Zalo), roles, permissions, and configuration flags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Payload size for user selection queries is reduced by over 50% compared to full user records.
- **SC-002**: 100% of user option queries return valid payloads matching the 4 required fields.
- **SC-003**: User profile lookups by ID return complete profile responses within 300ms for cached hits.
- **SC-004**: Workspace member selection dialog functions with zero breaking changes or runtime regressions.

## Assumptions

- The external Manage Service or identity backend supports or can be queried for option lists and detailed user profiles.
- Backward compatibility or routing aliases can be retained for `GET /api/v1/users` if other services or legacy callers depend on it, while `/users/option` and `/user/{id}` are introduced or aligned.
- Frontend components requiring user selection only need `id`, `name`, `email`, and `avatar_url`.
