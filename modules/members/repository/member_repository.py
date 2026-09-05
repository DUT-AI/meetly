from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.members.models.member import MemberModel


class SqlMemberRepository(IMemberRepository):
    """PostgreSQL implementation of IMemberRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add_member(
        self, workspace_id: str, user_id: str, role: MemberRole = MemberRole.MEMBER
    ) -> MemberEntity:
        model = MemberModel(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role.value,
        )
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_member(self, workspace_id: str, user_id: str) -> MemberEntity | None:
        stmt = select(MemberModel).where(
            MemberModel.workspace_id == workspace_id,
            MemberModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_by_id(self, member_id: str) -> MemberEntity | None:
        stmt = select(MemberModel).where(MemberModel.id == member_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_workspace(self, workspace_id: str) -> list[MemberEntity]:
        stmt = (
            select(MemberModel)
            .where(MemberModel.workspace_id == workspace_id)
            .order_by(MemberModel.created_at.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def list_by_user(self, user_id: str) -> list[MemberEntity]:
        stmt = (
            select(MemberModel)
            .where(MemberModel.user_id == user_id)
            .order_by(MemberModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def update_role(self, member_id: str, role: MemberRole) -> MemberEntity:
        stmt = select(MemberModel).where(MemberModel.id == member_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()
        model.role = role.value
        await self.session.flush()
        return model.to_entity()

    async def count_by_workspace(self, workspace_id: str) -> int:
        stmt = select(func.count(MemberModel.id)).where(
            MemberModel.workspace_id == workspace_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def delete(self, member_id: str) -> None:
        stmt = delete(MemberModel).where(MemberModel.id == member_id)
        await self.session.execute(stmt)

    async def delete_by_workspace(self, workspace_id: str) -> None:
        stmt = delete(MemberModel).where(MemberModel.workspace_id == workspace_id)
        await self.session.execute(stmt)
