from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.members.domain.interfaces import IMemberRepository
from modules.members.repository.member_repository import SqlMemberRepository
from modules.members.use_cases import (
    AddMemberUseCase,
    ListMembersUseCase,
    RemoveMemberUseCase,
    UpdateMemberRoleUseCase,
)


class MemberProvider(Provider):
    """Dishka provider for Members domain module."""

    scope = Scope.REQUEST

    @provide
    def get_member_repository(self, session: AsyncSession) -> IMemberRepository:
        return SqlMemberRepository(session)

    add_member_uc = provide(AddMemberUseCase)
    list_members_uc = provide(ListMembersUseCase)
    update_member_role_uc = provide(UpdateMemberRoleUseCase)
    remove_member_uc = provide(RemoveMemberUseCase)
