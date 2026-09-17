import asyncio
import sys
from datetime import UTC, datetime, timedelta
import secrets

from sqlalchemy import select

from core.database.session import AsyncSessionLocal
from modules.identity.client.manage_client import ManageClient
from modules.members.domain.enums import MemberRole
from modules.members.models.member import MemberModel
from modules.projects.models.project import ProjectModel
from modules.tasks.domain.enums import TaskPriority, TaskStatus
from modules.tasks.models.task import TaskModel
from modules.workspaces.models.workspace import WorkspaceModel

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")


async def seed_data():
    print("=== Đang bắt đầu seed data cho phòng ban test thông báo ===")

    # 1. Truy vấn user id từ Manage Server
    manage_client = ManageClient()
    users_resp = await manage_client.list_users(page=1, page_size=100)

    admin_user = None
    member_user = None

    for u in users_resp.items:
        email = (u.email or "").lower().strip()
        if email == "quedinhanhtu@gmail.com":
            admin_user = u
        elif email == "quetu0710@gmail.com":
            member_user = u

    admin_user_id = str(admin_user.id) if admin_user else "10"
    member_user_id = str(member_user.id) if member_user else "quetu0710"

    print(f"-> Admin User (quedinhanhtu@gmail.com): ID = {admin_user_id}")
    if member_user:
        print(f"-> Member User (quetu0710@gmail.com): ID = {member_user_id}")
    else:
        print(f"-> Member User (quetu0710@gmail.com) chưa có trên manage.dutai.io.vn, dùng tạm user_id = '{member_user_id}'")

    async with AsyncSessionLocal() as session:
        # 2. Tạo Workspace "Phòng ban test thông báo"
        ws_stmt = select(WorkspaceModel).where(WorkspaceModel.name == "Phòng ban test thông báo")
        existing_ws = (await session.execute(ws_stmt)).scalar_one_or_none()

        if not existing_ws:
            invite_code = secrets.token_hex(4).upper()
            ws = WorkspaceModel(
                name="Phòng ban test thông báo",
                owner_id=admin_user_id,
                invite_code=invite_code,
                note="Phòng ban dùng để kiểm thử thông báo qua Website, Discord, Zalo",
                notify_on_task_status_change=True,
                notify_task_status_discord=True,
                notify_task_status_zalo=True,
            )
            session.add(ws)
            await session.flush()
            print(f"-> Đã tạo Workspace mới: [{ws.id}] {ws.name}")
        else:
            ws = existing_ws
            print(f"-> Workspace đã tồn tại: [{ws.id}] {ws.name}")

        # 3. Tạo Members
        # Admin
        admin_mem_stmt = select(MemberModel).where(
            MemberModel.workspace_id == ws.id, MemberModel.user_id == admin_user_id
        )
        admin_mem = (await session.execute(admin_mem_stmt)).scalar_one_or_none()
        if not admin_mem:
            admin_mem = MemberModel(
                workspace_id=ws.id,
                user_id=admin_user_id,
                role=MemberRole.ADMIN.value,
            )
            session.add(admin_mem)
            await session.flush()
            print(f"-> Đã thêm Admin vào phòng ban: member_id = {admin_mem.id}")
        else:
            print(f"-> Admin đã có trong phòng ban: member_id = {admin_mem.id}")

        # Member (quetu0710)
        member_mem_stmt = select(MemberModel).where(
            MemberModel.workspace_id == ws.id, MemberModel.user_id == member_user_id
        )
        member_mem = (await session.execute(member_mem_stmt)).scalar_one_or_none()
        if not member_mem:
            member_mem = MemberModel(
                workspace_id=ws.id,
                user_id=member_user_id,
                role=MemberRole.MEMBER.value,
            )
            session.add(member_mem)
            await session.flush()
            print(f"-> Đã thêm Member vào phòng ban: member_id = {member_mem.id}")
        else:
            print(f"-> Member đã có trong phòng ban: member_id = {member_mem.id}")

        # 4. Tạo Project
        proj_stmt = select(ProjectModel).where(
            ProjectModel.workspace_id == ws.id, ProjectModel.name == "Dự án Test Thông Báo"
        )
        proj = (await session.execute(proj_stmt)).scalar_one_or_none()
        if not proj:
            proj = ProjectModel(
                workspace_id=ws.id,
                name="Dự án Test Thông Báo",
            )
            session.add(proj)
            await session.flush()
            print(f"-> Đã tạo Project mới: [{proj.id}] {proj.name}")
        else:
            print(f"-> Project đã có sẵn: [{proj.id}] {proj.name}")

        # 5. Tạo Task với tiêu đề "test"
        task_stmt = select(TaskModel).where(
            TaskModel.workspace_id == ws.id, TaskModel.name == "test"
        )
        task = (await session.execute(task_stmt)).scalar_one_or_none()
        due = datetime.now(UTC) + timedelta(days=3)
        if not task:
            task = TaskModel(
                name="test",
                status=TaskStatus.TODO.value,
                priority=TaskPriority.HIGH.value,
                labels=["test", "notification"],
                workspace_id=ws.id,
                project_id=proj.id,
                assignee_ids=[member_mem.id, admin_mem.id],
                due_date=due,
                position=1000,
                description="Task thử nghiệm tính năng thông báo trạng thái công việc (Web, Discord, Zalo).",
            )
            session.add(task)
            await session.flush()
            print(f"-> Đã tạo Task: [{task.id}] '{task.name}' giao cho assignees: {task.assignee_ids}")
        else:
            task.assignee_ids = [member_mem.id, admin_mem.id]
            task.due_date = due
            print(f"-> Task 'test' đã tồn tại, đã cập nhật assignees: {task.assignee_ids}")

        await session.commit()
        print("\n=== HOÀN TẤT SEED DATA THÀNH CÔNG ===")
        print(f"Workspace ID: {ws.id}")
        print(f"Project ID: {proj.id}")
        print(f"Task ID: {task.id}")
        print(f"URL xem task: http://localhost:3000/workspaces/{ws.id}/tasks")

        # 6. Tùy chọn test dispatch notification ngay qua Zalo (nếu có cờ --dispatch)
        if "--dispatch" in sys.argv or "-d" in sys.argv:
            print("\n=== BẮT ĐẦU TEST DISPATCH THÔNG BÁO VÀ STICKER ZALO ===")
            from modules.notifications.channels.zalo_channel import ZaloBotChannel
            from modules.notifications.domain.entities import NotificationMessage
            from modules.notifications.services.zalo_bot_client import ZaloBotClient

            zalo_client = ZaloBotClient()
            zalo_channel = ZaloBotChannel(zalo_client=zalo_client)

            # Lấy chat_id từ tham số --chat-id hoặc từ user
            chat_id = None
            for idx, arg in enumerate(sys.argv):
                if arg == "--chat-id" and idx + 1 < len(sys.argv):
                    chat_id = sys.argv[idx + 1]
                    break

            target_user = admin_user or member_user
            if not chat_id and target_user and getattr(target_user, "zalo_bot_id", None):
                chat_id = target_user.zalo_bot_id

            if not chat_id:
                print("-> Chú ý: Chưa tìm thấy zalo_bot_id. Hãy truyền thêm tham số: --chat-id <zalo_chat_id>")
            else:
                if target_user:
                    target_user.zalo_bot_id = chat_id
                print(f"-> Gửi thông báo thử nghiệm tới Zalo Chat ID: {chat_id}")

                # Test 1: Thông báo bình thường (sẽ tự động đính kèm sticker bình thường)
                msg_normal = NotificationMessage(
                    recipient_user_id=str(target_user.id if target_user else "test_user"),
                    event_type="task_status_changed",
                    title="Công việc 'test' đã chuyển trạng thái sang 'Đang làm'",
                    content="Công việc test được cập nhật bởi hệ thống kiểm thử.",
                    action_url=f"/workspaces/{ws.id}/tasks/{task.id}",
                )
                print("-> Đang gửi thông báo bình thường kèm sticker...")
                ok_normal = await zalo_channel.send(target_user, msg_normal)
                print(f"   Kết quả thông báo bình thường: {'Thành công' if ok_normal else 'Thất bại'}")

                # Test 2: Thông báo trễ hạn / deadline (sẽ tự động đính kèm sticker giận dỗi / tức giận)
                msg_angry = NotificationMessage(
                    recipient_user_id=str(target_user.id if target_user else "test_user"),
                    event_type="task_overdue",
                    title="⚠️ Công việc 'test' đã quá hạn 1 ngày!",
                    content="Hạn chót đã qua, vui lòng cập nhật tiến độ công việc ngay!",
                    action_url=f"/workspaces/{ws.id}/tasks/{task.id}",
                )
                print("-> Đang gửi thông báo trễ hạn/deadline kèm sticker tức giận...")
                ok_angry = await zalo_channel.send(target_user, msg_angry)
                print(f"   Kết quả thông báo quá hạn: {'Thành công' if ok_angry else 'Thất bại'}")


if __name__ == "__main__":
    asyncio.run(seed_data())
