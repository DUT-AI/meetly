from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCommentCreateDTO(BaseModel):
    content: str = Field(..., min_length=1)
    mentions: list[str] = Field(default_factory=list)


class TaskCommentUpdateDTO(BaseModel):
    content: str = Field(..., min_length=1)
    mentions: list[str] | None = None


class TaskCommentUserDTO(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: str | None = None


class TaskCommentResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    user_id: str
    content: str
    mentions: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    user: TaskCommentUserDTO
