"""add_notification_settings_to_workspaces

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-09-13 11:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6g7h8"
down_revision: str | None = "b2c3d4e5f6g7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column(
            "notify_on_task_status_change",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "workspaces",
        sa.Column(
            "notify_task_status_discord",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "workspaces",
        sa.Column(
            "notify_task_status_zalo",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "workspaces",
        sa.Column("zalo_room_id", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workspaces", "zalo_room_id")
    op.drop_column("workspaces", "notify_task_status_zalo")
    op.drop_column("workspaces", "notify_task_status_discord")
    op.drop_column("workspaces", "notify_on_task_status_change")
