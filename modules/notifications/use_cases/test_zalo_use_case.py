from dataclasses import dataclass

from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.notifications.channels.zalo_channel import ZaloBotChannel
from modules.notifications.domain.entities import NotificationMessage


@dataclass
class TestZaloUseCase:
    """Use case to test Zalo integration by dispatching a test notification directly through ZaloBotChannel."""

    __test__ = False

    zalo_channel: ZaloBotChannel

    async def execute(
        self, user_id: str, zalo_bot_id: str, payload_type: str, payload_value: str
    ) -> bool:
        """
        payload_type: 'text', 'photo', 'sticker'
        payload_value: text content, image URL, or sticker ID
        """
        # Create a mock user
        recipient = ManageUserDTO(
            id=user_id,
            email="test@meetly.io",
            name="Test User",
            status="ACTIVE",
            roles=[],
            zalo_bot_id=zalo_bot_id,
        )

        message = NotificationMessage(
            recipient_user_id=user_id,
            event_type="test_zalo",
            title="Tin nhắn thử nghiệm từ hệ thống",
            content="Đây là một tin nhắn kiểm tra tính năng Zalo Bot.",
            action_url="/tasks",
        )

        if payload_type == "photo":
            message.image_url = payload_value
            message.content = "Đính kèm một hình ảnh vui nhộn!"
        elif payload_type == "sticker":
            message.sticker_id = payload_value
            message.content = "Gửi bạn một chiếc sticker!"
        else:
            message.content = payload_value

        return await self.zalo_channel.send(recipient, message)
