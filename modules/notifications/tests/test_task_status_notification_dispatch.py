from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from modules.identity.client.manage_client import ManageClient
from modules.identity.dtos.manage_dtos import ManageUserDTO
from modules.members.domain.entities import MemberEntity
from modules.members.domain.enums import MemberRole
from modules.members.domain.interfaces import IMemberRepository
from modules.notifications.dispatcher import NotificationDispatcher
from modules.notifications.services.discord_service import DiscordService
from modules.notifications.services.zalo_bot_client import ZaloBotClient
from modules.projects.domain.interfaces import IProjectRepository
from modules.tasks.domain.enums import TaskStatus
from modules.tasks.use_cases.task_use_cases import (
    _dispatch_task_status_notifications,
)
from modules.workspaces.domain.entities import WorkspaceEntity
from modules.workspaces.domain.interfaces import IWorkspaceRepository


@pytest.mark.asyncio
async def test_dispatch_when_all_notifications_enabled() -> None:
    # Arrange
    workspace_repo = AsyncMock(spec=IWorkspaceRepository)
    project_repo = AsyncMock(spec=IProjectRepository)
    member_repo = AsyncMock(spec=IMemberRepository)
    manage_client = AsyncMock(spec=ManageClient)
    notification_dispatcher = AsyncMock(spec=NotificationDispatcher)
    discord_service = AsyncMock(spec=DiscordService)
    zalo_client = AsyncMock(spec=ZaloBotClient)

    now = datetime.now(UTC)
    workspace = WorkspaceEntity(
        id="ws_1",
        name="Phòng Kỹ Thuật",
        owner_id="admin_1",
        invite_code="INV123",
        image_url=None,
        created_at=now,
        updated_at=now,
        discord_room_id="discord_room_999",
        zalo_room_id="zalo_group_888",
        notify_on_task_status_change=True,
        notify_task_status_discord=True,
        notify_task_status_zalo=True,
    )
    workspace_repo.get_by_id.return_value = workspace
    project_repo.get_by_id.return_value = None

    assignee_member = MemberEntity(
        id="mem_assignee",
        workspace_id="ws_1",
        user_id="user_assignee",
        role=MemberRole.MEMBER,
        created_at=now,
        updated_at=now,
    )
    admin_member = MemberEntity(
        id="mem_admin",
        workspace_id="ws_1",
        user_id="user_admin",
        role=MemberRole.ADMIN,
        created_at=now,
        updated_at=now,
    )
    actor_member = MemberEntity(
        id="mem_actor",
        workspace_id="ws_1",
        user_id="user_actor",
        role=MemberRole.MEMBER,
        created_at=now,
        updated_at=now,
    )

    member_repo.get_by_id.return_value = assignee_member
    member_repo.list_by_workspace.return_value = [
        assignee_member,
        admin_member,
        actor_member,
    ]

    manage_client.get_user.return_value = ManageUserDTO(
        id="user_assignee",
        name="Assignee Name",
        email="assignee@example.com",
    )

    # Act
    await _dispatch_task_status_notifications(
        workspace_repo=workspace_repo,
        project_repo=project_repo,
        member_repo=member_repo,
        manage_client=manage_client,
        notification_dispatcher=notification_dispatcher,
        discord_service=discord_service,
        zalo_client=zalo_client,
        workspace_id="ws_1",
        project_id="proj_1",
        task_id="task_1",
        task_name="Triển khai tính năng mới",
        old_status=TaskStatus.IN_PROGRESS,
        new_status=TaskStatus.DONE,
        actor_id="user_actor",
        actor_name="Actor User",
        actor_avatar=None,
        action_url="/workspaces/ws_1/tasks/task_1",
        assignee_id="mem_assignee",
    )

    # Assert
    # 1. Check dispatch calls: Should dispatch to Assignee and Admin (not actor)
    assert notification_dispatcher.dispatch.await_count == 2
    dispatched_messages = [
        call.args[0] for call in notification_dispatcher.dispatch.await_args_list
    ]
    recipient_ids = {msg.recipient_user_id for msg in dispatched_messages}
    assert recipient_ids == {"user_assignee", "user_admin"}

    for msg in dispatched_messages:
        assert msg.channels == ["website", "discord", "zalo"]
        assert "Done" in msg.title

    # 2. Check Discord room notification was called
    discord_service.send_message_to_channel.assert_awaited_once()

    # 3. Check Zalo room notification was called
    zalo_client.send_message.assert_awaited_once()


@pytest.mark.asyncio
async def test_dispatch_when_all_notifications_disabled() -> None:
    # Arrange: All toggles False
    workspace_repo = AsyncMock(spec=IWorkspaceRepository)
    project_repo = AsyncMock(spec=IProjectRepository)
    member_repo = AsyncMock(spec=IMemberRepository)
    manage_client = AsyncMock(spec=ManageClient)
    notification_dispatcher = AsyncMock(spec=NotificationDispatcher)
    discord_service = AsyncMock(spec=DiscordService)
    zalo_client = AsyncMock(spec=ZaloBotClient)

    now = datetime.now(UTC)
    workspace = WorkspaceEntity(
        id="ws_1",
        name="Phòng Kỹ Thuật",
        owner_id="admin_1",
        invite_code="INV123",
        image_url=None,
        created_at=now,
        updated_at=now,
        discord_room_id="discord_room_999",
        zalo_room_id="zalo_group_888",
        notify_on_task_status_change=False,  # Disabled
        notify_task_status_discord=False,  # Disabled
        notify_task_status_zalo=False,  # Disabled
    )
    workspace_repo.get_by_id.return_value = workspace

    # Act
    await _dispatch_task_status_notifications(
        workspace_repo=workspace_repo,
        project_repo=project_repo,
        member_repo=member_repo,
        manage_client=manage_client,
        notification_dispatcher=notification_dispatcher,
        discord_service=discord_service,
        zalo_client=zalo_client,
        workspace_id="ws_1",
        project_id="proj_1",
        task_id="task_1",
        task_name="Task Disabled",
        old_status=TaskStatus.TODO,
        new_status=TaskStatus.IN_PROGRESS,
        actor_id="user_actor",
        actor_name="Actor",
        actor_avatar=None,
        action_url="/task/1",
        assignee_id="mem_1",
    )

    # Assert
    notification_dispatcher.dispatch.assert_not_awaited()
    discord_service.send_message_to_channel.assert_not_awaited()
    zalo_client.send_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_dispatch_when_only_discord_enabled() -> None:
    # Arrange: Only Discord enabled, in-app and Zalo disabled
    workspace_repo = AsyncMock(spec=IWorkspaceRepository)
    project_repo = AsyncMock(spec=IProjectRepository)
    member_repo = AsyncMock(spec=IMemberRepository)
    manage_client = AsyncMock(spec=ManageClient)
    notification_dispatcher = AsyncMock(spec=NotificationDispatcher)
    discord_service = AsyncMock(spec=DiscordService)
    zalo_client = AsyncMock(spec=ZaloBotClient)

    now = datetime.now(UTC)
    workspace = WorkspaceEntity(
        id="ws_1",
        name="Phòng Kỹ Thuật",
        owner_id="admin_1",
        invite_code="INV123",
        image_url=None,
        created_at=now,
        updated_at=now,
        discord_room_id="discord_room_999",
        zalo_room_id="zalo_group_888",
        notify_on_task_status_change=False,  # Disabled
        notify_task_status_discord=True,  # Enabled
        notify_task_status_zalo=False,  # Disabled
    )
    workspace_repo.get_by_id.return_value = workspace
    project_repo.get_by_id.return_value = None

    assignee_member = MemberEntity(
        id="mem_assignee",
        workspace_id="ws_1",
        user_id="user_assignee",
        role=MemberRole.MEMBER,
        created_at=now,
        updated_at=now,
    )
    member_repo.get_by_id.return_value = assignee_member
    member_repo.list_by_workspace.return_value = [assignee_member]
    manage_client.get_user.return_value = ManageUserDTO(
        id="user_assignee",
        name="Assignee",
        email="a@example.com",
    )

    # Act
    await _dispatch_task_status_notifications(
        workspace_repo=workspace_repo,
        project_repo=project_repo,
        member_repo=member_repo,
        manage_client=manage_client,
        notification_dispatcher=notification_dispatcher,
        discord_service=discord_service,
        zalo_client=zalo_client,
        workspace_id="ws_1",
        project_id="proj_1",
        task_id="task_1",
        task_name="Discord Only Task",
        old_status=TaskStatus.TODO,
        new_status=TaskStatus.DONE,
        actor_id="user_actor",
        actor_name="Actor",
        actor_avatar=None,
        action_url="/tasks/1",
        assignee_id="mem_assignee",
    )

    # Assert:
    # 1. Dispatched messages have channels=["discord"]
    assert notification_dispatcher.dispatch.await_count == 1
    msg = notification_dispatcher.dispatch.await_args.args[0]
    assert msg.channels == ["discord"]

    # 2. Discord room called
    discord_service.send_message_to_channel.assert_awaited_once()

    # 3. Zalo room NOT called
    zalo_client.send_message.assert_not_awaited()
