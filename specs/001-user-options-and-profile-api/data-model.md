# Data Model: User Options and Profile Detail

## Entities & DTOs

### 1. UserOptionDTO (Lightweight Projection)
Used by `GET /api/v1/users/option` (and `/users/option`).

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `int \| str` | Yes | Unique identifier of the user (e.g. 63) |
| `name` | `str` | Yes | Full name or display name |
| `email` | `str` | Yes | Email address of the user |
| `avatar_url` | `str \| None` | No | Direct MinIO/CDN image URL or null |

**JSON Representation**:
```json
{
  "id": 63,
  "name": "Trần Nguyên Bình",
  "email": "trannguyenbinh14@gmail.com",
  "avatar_url": "https://minio.dutai.site/dut-ai-manager-prod/avatars/63_20261006_090826.jpeg"
}
```

---

### 2. UserProfileDetailDTO (Full Profile)
Used inside the `data` envelope for `GET /api/v1/user/{id}` and `GET /api/v1/users/{id}`.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `int \| str` | Yes | Unique identifier |
| `name` | `str` | Yes | Full name |
| `email` | `str` | Yes | Email address |
| `phone_number` | `str \| None` | No | Contact phone number |
| `status` | `str` | Yes | User account status (e.g. "ACTIVE") |
| `role_ids` | `list[int \| str]` | Yes | List of role IDs assigned |
| `role_names` | `list[str]` | Yes | List of role names assigned |
| `discord_id` | `str \| None` | No | Discord snowflake ID |
| `zalo_bot_id` | `str \| None` | No | Zalo bot user chat ID |
| `avatar_url` | `str \| None` | No | MinIO/CDN avatar URL |
| `permissions` | `list[str]` | Yes | List of granular RBAC permissions |
| `check_in_card_code_configured` | `bool` | Yes | Card check-in status flag |

---

### 3. UserProfileEnvelopeDTO
Standard API response envelope matching Manage API conventions.

| Field | Type | Value / Description |
|---|---|---|
| `is_success` | `bool` | `true` |
| `status_code` | `int` | `200` |
| `data` | `UserProfileDetailDTO` | Detailed user profile |
| `message` | `str` | `"Fetched user profile"` |
| `pagination` | `Any \| None` | `null` |
