from loguru import logger
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.notifications.models.push_subscription import PushSubscriptionModel


class PushSubscriptionRepository:
    """Repository to manage Web Push subscriptions in PostgreSQL."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert(
        self,
        user_id: str,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str | None = None,
    ) -> PushSubscriptionModel:
        query = select(PushSubscriptionModel).where(
            PushSubscriptionModel.endpoint == endpoint
        )
        result = await self.session.execute(query)
        existing = result.scalars().first()

        if existing:
            existing.user_id = user_id
            existing.p256dh = p256dh
            existing.auth = auth
            existing.user_agent = user_agent
            await self.session.commit()
            await self.session.refresh(existing)
            logger.info(f"[WebPushRepo] Updated existing push subscription for user {user_id}")
            return existing

        sub = PushSubscriptionModel(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=user_agent,
        )
        self.session.add(sub)
        await self.session.commit()
        await self.session.refresh(sub)
        logger.info(f"[WebPushRepo] Registered new push subscription for user {user_id}")
        return sub

    async def list_by_user(self, user_id: str) -> list[PushSubscriptionModel]:
        query = select(PushSubscriptionModel).where(
            PushSubscriptionModel.user_id == user_id
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def delete_by_endpoint(self, endpoint: str) -> bool:
        stmt = delete(PushSubscriptionModel).where(
            PushSubscriptionModel.endpoint == endpoint
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0

    async def delete_by_user(self, user_id: str) -> int:
        stmt = delete(PushSubscriptionModel).where(
            PushSubscriptionModel.user_id == user_id
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount

