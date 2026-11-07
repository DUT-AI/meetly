from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.identity.client.manage_client import ManageClient
from modules.notifications.channels.discord_channel import DiscordChannel
from modules.notifications.channels.web_push_channel import WebPushChannel
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
from modules.notifications.repository.push_subscription_repository import (
    PushSubscriptionRepository,
)
from modules.notifications.services.discord_service import DiscordService
from modules.notifications.services.web_push_service import WebPushService
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

    @provide(scope=Scope.REQUEST)
    def get_push_subscription_repository(
        self, session: AsyncSession
    ) -> PushSubscriptionRepository:
        return PushSubscriptionRepository(session)

    @provide(scope=Scope.APP)
    def get_discord_service(self) -> DiscordService:
        return DiscordService()

    @provide(scope=Scope.APP)
    def get_zalo_bot_client(self) -> ZaloBotClient:
        return ZaloBotClient()

    @provide(scope=Scope.APP)
    def get_web_push_service(self) -> WebPushService:
        return WebPushService()

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
    def get_web_push_channel(
        self,
        push_repo: PushSubscriptionRepository,
        push_service: WebPushService,
    ) -> WebPushChannel:
        return WebPushChannel(push_repo=push_repo, push_service=push_service)

    @provide(scope=Scope.REQUEST)
    def get_notification_dispatcher(
        self,
        web_push_channel: WebPushChannel,
        website_channel: WebsiteInAppChannel,
        zalo_channel: ZaloBotChannel,
        discord_channel: DiscordChannel,
        manage_client: ManageClient,
    ) -> NotificationDispatcher:
        channels: list[INotificationChannel] = [
            web_push_channel,
            website_channel,
            zalo_channel,
            discord_channel,
        ]
        return NotificationDispatcher(channels=channels, manage_client=manage_client)

    @provide(scope=Scope.REQUEST)
    def get_send_notification_use_case(
        self,
        web_push_channel: WebPushChannel,
        website_channel: WebsiteInAppChannel,
        zalo_channel: ZaloBotChannel,
        discord_channel: DiscordChannel,
        manage_client: ManageClient,
    ) -> SendNotificationUseCase:
        channels: list[INotificationChannel] = [
            web_push_channel,
            website_channel,
            zalo_channel,
            discord_channel,
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
    def get_test_zalo_use_case(self, zalo_channel: ZaloBotChannel) -> TestZaloUseCase:
        return TestZaloUseCase(zalo_channel)
