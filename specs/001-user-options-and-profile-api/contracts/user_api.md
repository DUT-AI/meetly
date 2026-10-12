# API Contracts: User Options and Profile Detail

## 1. Get User Options

- **Route**: `GET /api/v1/users/option`
- **Summary**: Retrieve a lightweight list of users for selection inputs and dropdowns.
- **Query Parameters**:
  - `search` (string, optional): Filter by name or email.
- **Response**: `200 OK`
- **Body**: `list[UserOption]`

```json
[
  {
    "id": 63,
    "name": "Trần Nguyên Bình",
    "email": "trannguyenbinh14@gmail.com",
    "avatar_url": "https://minio.dutai.site/dut-ai-manager-prod/avatars/63_20261006_090826.jpeg"
  }
]
```

---

## 2. Get User Profile Detail by ID

- **Route**: `GET /api/v1/users/{id}`
- **Summary**: Retrieve full profile details for a specific user.
- **Path Parameters**:
  - `id` (int or string, required): User ID.
- **Response**: `200 OK`
- **Body**:

```json
{
  "is_success": true,
  "status_code": 200,
  "data": {
    "name": "Huỳnh Phước Nguyên",
    "email": "huynhphuocnguyen.dev@gmail.com",
    "phone_number": "0931960822",
    "status": "ACTIVE",
    "role_ids": [
      1,
      9
    ],
    "discord_id": "363660101631868929",
    "id": 1,
    "avatar_url": "https://minio.dutai.site/dut-ai-manager-prod/avatars/1_20260821_171843.jpg",
    "zalo_bot_id": "6b3eb58134cadd9484db",
    "role_names": [
      "admin",
      "Trainer"
    ],
    "permissions": [
      "meeting:create",
      "meeting:read"
    ],
    "check_in_card_code_configured": true
  },
  "message": "Fetched user profile",
  "pagination": null
}
```

- **Error Responses**:
  - `404 Not Found`:
    ```json
    {
      "detail": "User not found"
    }
    ```
