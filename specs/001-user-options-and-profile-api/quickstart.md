# Quickstart Validation Guide: User Options & Profile Detail API

## Overview
This guide provides test commands to validate the changes end-to-end.

## 1. Backend Verification

### Prerequisites
- Meetly backend API running or test suite executed via `pytest`.

### Test Option Endpoint:
```bash
curl -X GET "http://localhost:8000/api/v1/users/option" \
  -H "Authorization: Bearer <token>"
```
**Expected**: Array of user objects containing only `id`, `name`, `email`, and `avatar_url`.

### Test Profile Detail Endpoint:
```bash
curl -X GET "http://localhost:8000/api/v1/users/1" \
  -H "Authorization: Bearer <token>"
```
**Expected**: Envelope response with `is_success: true`, `status_code: 200`, and full `data` object including `permissions`, `role_names`, etc.

## 2. Automated Tests
Run backend test suite:
```bash
pytest tests/modules/identity -v
```

## 3. Frontend Verification
1. Start frontend: `pnpm --filter web dev`
2. Open workspace member management dialog ("Thêm nhân sự").
3. Search for a member by name/email.
4. Verify results display name, avatar, and email without errors.
