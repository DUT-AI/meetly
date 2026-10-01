from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.transcription.domain.interfaces import IVoiceProfileRepository
from modules.transcription.domain.voice_profile import VoiceProfileEntity
from modules.transcription.models.voice_profile import MemberVoiceProfileModel


class SqlVoiceProfileRepository(IVoiceProfileRepository):
    """SQLAlchemy implementation of Member Voice Profile Centroid Voicebank."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_user_id(
        self, workspace_id: str, user_id: str
    ) -> VoiceProfileEntity | None:
        stmt = select(MemberVoiceProfileModel).where(
            MemberVoiceProfileModel.workspace_id == workspace_id,
            MemberVoiceProfileModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_workspace(self, workspace_id: str) -> list[VoiceProfileEntity]:
        stmt = (
            select(MemberVoiceProfileModel)
            .where(MemberVoiceProfileModel.workspace_id == workspace_id)
            .order_by(MemberVoiceProfileModel.member_name.asc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def save(
        self,
        workspace_id: str,
        user_id: str,
        member_name: str,
        centroid_vector: list[float],
        sample_count: int = 1,
    ) -> VoiceProfileEntity:
        stmt = select(MemberVoiceProfileModel).where(
            MemberVoiceProfileModel.workspace_id == workspace_id,
            MemberVoiceProfileModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.member_name = member_name
            model.centroid_vector = centroid_vector
            model.sample_count = sample_count
        else:
            model = MemberVoiceProfileModel(
                workspace_id=workspace_id,
                user_id=user_id,
                member_name=member_name,
                centroid_vector=centroid_vector,
                sample_count=sample_count,
            )
            self.session.add(model)

        await self.session.flush()
        return model.to_entity()

    async def delete(self, profile_id: str) -> bool:
        stmt = delete(MemberVoiceProfileModel).where(
            MemberVoiceProfileModel.id == profile_id
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0
