from dataclasses import dataclass
from datetime import datetime

from modules.members.domain.enums import MemberRole


@dataclass
class MemberEntity:
    id: str
    workspace_id: str
    user_id: str
    role: MemberRole
    created_at: datetime
    updated_at: datetime
