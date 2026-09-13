from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.identity.client.manage_client import ManageClient
from modules.notifications.channels.discord_channel import DiscordChannel
from modules.notifications.channels.website_channel import WebsiteInAppChannel
from modules.notifications.channels.zalo_channel import ZaloBotChannel
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.domain.interfaces import (
    INotificationChannel,
    INotificationRepository,
)
from modules.notifications.repository.notification_repository import (
    SqlNotificationRepository,
)
from modules.notifications.services.discord_service import DiscordService
from modules.notifications.services.zalo_bot_client import ZaloBotClient
from modules.notifications.use_cases import (
    ListNotificationsUseCase,
    MarkAllNotificationsReadUseCase,
    MarkNotificationReadUseCase,
    SendNotificationUseCase,
)
from modules.notifications.use_cases.test_zalo_use_case import TestZaloUseCase


class NotificationProvider(Provider):
    """Dishka provider for Notifications module."""

    @provide(scope=Scope.REQUEST)
    def get_notification_repository(
        self, session: AsyncSession
    ) -> INotificationRepository:
        return SqlNotificationRepository(session)

    @provide(scope=Scope.APP)
    def get_discord_service(self) -> DiscordService:
        return DiscordService()

    @provide(scope=Scope.APP)
    def get_zalo_bot_client(self) -> ZaloBotClient:
        return ZaloBotClient()

    @provide(scope=Scope.REQUEST)
    def get_website_channel(
        self, notification_repo: INotificationRepository
    ) -> WebsiteInAppChannel:
        return WebsiteInAppChannel(notification_repo)

    @provide(scope=Scope.APP)
    def get_discord_channel(self, discord_service: DiscordService) -> DiscordChannel:
        return DiscordChannel(discord_service)

    @provide(scope=Scope.APP)
    def get_zalo_channel(self, zalo_client: ZaloBotClient) -> ZaloBotChannel:
        return ZaloBotChannel(zalo_client)

    @provide(scope=Scope.REQUEST)
    def get_notification_dispatcher(
        self,
        website_channel: WebsiteInAppChannel,
        discord_channel: DiscordChannel,
        zalo_channel: ZaloBotChannel,
        manage_client: ManageClient,
    ) -> NotificationDispatcher:
        channels: list[INotificationChannel] = [
            website_channel,
            discord_channel,
            zalo_channel,
        ]
        return NotificationDispatcher(channels=channels, manage_client=manage_client)

    @provide(scope=Scope.REQUEST)
    def get_send_notification_use_case(
        self,
        website_channel: WebsiteInAppChannel,
        discord_channel: DiscordChannel,
        zalo_channel: ZaloBotChannel,
        manage_client: ManageClient,
    ) -> SendNotificationUseCase:
        channels: list[INotificationChannel] = [
            website_channel,
            discord_channel,
            zalo_channel,
        ]
        return SendNotificationUseCase(channels=channels, manage_client=manage_client)

    @provide(scope=Scope.REQUEST)
    def get_list_notifications_use_case(
        self, repo: INotificationRepository
    ) -> ListNotificationsUseCase:
        return ListNotificationsUseCase(repo)

    @provide(scope=Scope.REQUEST)
    def get_mark_notification_read_use_case(
        self, repo: INotificationRepository
    ) -> MarkNotificationReadUseCase:
        return MarkNotificationReadUseCase(repo)

    @provide(scope=Scope.REQUEST)
    def get_mark_all_notifications_read_use_case(
        self, repo: INotificationRepository
    ) -> MarkAllNotificationsReadUseCase:
        return MarkAllNotificationsReadUseCase(repo)

    @provide(scope=Scope.REQUEST)
    def get_test_zalo_use_case(
        self, zalo_channel: ZaloBotChannel
    ) -> TestZaloUseCase:
        return TestZaloUseCase(zalo_channel)
