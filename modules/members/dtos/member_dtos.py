from datetime import datetime

from pydantic import BaseModel, ConfigDict

from modules.members.domain.enums import MemberRole


class MemberResponseDTO(BaseModel):
    """Member response payload populated with user information."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: str
    name: str = ""
    email: str = ""
    avatar_url: str | None = None
    role: MemberRole
    created_at: datetime
    updated_at: datetime


class UpdateMemberRoleDTO(BaseModel):
    """Payload to update member role."""

    role: MemberRole


class AddMemberDTO(BaseModel):
    """Payload to add a member to a workspace."""

    workspace_id: str
    user_id: str | int
    role: MemberRole = MemberRole.MEMBER
