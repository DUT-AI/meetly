from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.deps.auth import get_current_user
from apps.api.main import app
from modules.identity.domain.entities import AuthUser
from modules.identity.dtos.user_dtos import UserOptionDTO, UserProfileDetailDTO


@pytest.mark.asyncio
async def test_get_user_options_endpoint():
    mock_user = AuthUser(
        id=1,
        name="Test User",
        email="test@example.com",
        status="ACTIVE",
        avatar_url="https://example.com/avatar.jpg",
    )
    app.dependency_overrides[get_current_user] = lambda: mock_user

    sample_users = [
        UserOptionDTO(
            id=63,
            name="Trần Nguyên Bình",
            email="trannguyenbinh14@gmail.com",
            avatar_url="https://minio.dutai.site/avatar.jpeg",
        )
    ]

    with patch(
        "modules.identity.client.manage_client.ManageClient.list_users",
        new_callable=AsyncMock,
    ) as mock_list_users:
        mock_list_users.return_value = sample_users

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/v1/users/option")
            assert resp.status_code == 200
            data = resp.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0] == {
                "id": 63,
                "name": "Trần Nguyên Bình",
                "email": "trannguyenbinh14@gmail.com",
                "avatar_url": "https://minio.dutai.site/avatar.jpeg",
            }

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_user_profile_endpoint():
    mock_user = AuthUser(
        id=1,
        name="Test User",
        email="test@example.com",
        status="ACTIVE",
    )
    app.dependency_overrides[get_current_user] = lambda: mock_user

    sample_profile_dict = {
        "id": 1,
        "name": "Huỳnh Phước Nguyên",
        "email": "huynhphuocnguyen.dev@gmail.com",
        "phone_number": "0931960822",
        "status": "ACTIVE",
        "role_ids": [1, 9],
        "discord_id": "363660101631868929",
        "avatar_url": "https://minio.dutai.site/avatar.jpg",
        "zalo_bot_id": "6b3eb58134cadd9484db",
        "role_names": ["admin", "Trainer"],
        "permissions": ["meeting:create", "meeting:read"],
        "check_in_card_code_configured": True,
    }

    with patch(
        "modules.identity.client.manage_client.ManageClient.get_user",
        new_callable=AsyncMock,
    ) as mock_get_user:
        mock_get_user.return_value = UserProfileDetailDTO(**sample_profile_dict)

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/v1/users/1")
            assert resp.status_code == 200
            res = resp.json()
            assert res["is_success"] is True
            assert res["status_code"] == 200
            assert res["message"] == "Fetched user profile"
            assert res["pagination"] is None
            assert res["data"]["id"] == 1
            assert res["data"]["name"] == "Huỳnh Phước Nguyên"
            assert "meeting:create" in res["data"]["permissions"]

    app.dependency_overrides.clear()
