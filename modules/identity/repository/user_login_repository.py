from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from modules.identity.domain.entities import UserLoginMetadataEntity
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.models.user_login import UserLoginMetadataModel


class SqlUserLoginRepository(IUserLoginRepository):
    """PostgreSQL implementation of IUserLoginRepository using atomic upsert."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert_last_login(
        self, user_id: str, last_login_at: datetime
    ) -> UserLoginMetadataEntity:
        """Atomically insert or update last_login_at timestamp."""
        now = datetime.now(UTC)
        stmt = (
            insert(UserLoginMetadataModel)
            .values(
                user_id=user_id,
                last_login_at=last_login_at,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=[UserLoginMetadataModel.user_id],
                set_={
                    "last_login_at": last_login_at,
                    "updated_at": now,
                },
            )
            .returning(UserLoginMetadataModel)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        model = result.scalar_one()
        return model.to_entity()

    async def get_by_user_id(self, user_id: str) -> UserLoginMetadataEntity | None:
        """Fetch last login record for a single user."""
        stmt = select(UserLoginMetadataModel).where(
            UserLoginMetadataModel.user_id == user_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_by_user_ids(self, user_ids: Sequence[str]) -> dict[str, datetime]:
        """Batch fetch last login timestamps mapped by user_id."""
        if not user_ids:
            return {}
        stmt = select(
            UserLoginMetadataModel.user_id,
            UserLoginMetadataModel.last_login_at,
        ).where(UserLoginMetadataModel.user_id.in_(user_ids))
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}
