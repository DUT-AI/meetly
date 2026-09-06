from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceLabelCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#3b82f6", max_length=20)


class WorkspaceLabelUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    color: str | None = Field(None, max_length=20)


class WorkspaceLabelResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    name: str
    color: str
    created_at: datetime
    updated_at: datetime
