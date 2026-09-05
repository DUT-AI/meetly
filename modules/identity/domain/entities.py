from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, Field


class AuthUser(BaseModel):
    """User profile model parsed from Auth Server / JWT."""

    id: int | str
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    """Token payload returned upon successful login."""

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


@dataclass
class UserLoginMetadataEntity:
    """Domain entity representing a user's last login record in Meetly."""

    user_id: str
    last_login_at: datetime
    created_at: datetime | None = None
    updated_at: datetime | None = None
