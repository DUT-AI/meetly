from collections.abc import AsyncIterable

from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from core.config import db_settings


def create_engine(url: str, echo: bool = False) -> AsyncEngine:
    """Create async SQLAlchemy engine."""
    return create_async_engine(
        url,
        echo=echo,
        future=True,
        pool_pre_ping=True,
    )


def create_session_factory(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    """Create async session factory bound to the given engine."""
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


engine = create_engine(db_settings.database_url, echo=db_settings.db_echo)
AsyncSessionLocal = create_session_factory(engine)


class DatabaseProvider(Provider):
    """Dishka provider for database sessions and engine."""

    @provide(scope=Scope.APP)
    def get_engine(self) -> AsyncEngine:
        return engine

    @provide(scope=Scope.APP)
    def get_session_factory(
        self,
    ) -> async_sessionmaker[AsyncSession]:
        return AsyncSessionLocal

    @provide(scope=Scope.REQUEST)
    async def get_session(self) -> AsyncIterable[AsyncSession]:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
