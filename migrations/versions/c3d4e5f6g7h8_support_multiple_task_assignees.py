"""support_multiple_task_assignees

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-09-13 10:50:00.000000

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
    # 1. Create junction table for tasks <-> members
    op.create_table(
        "task_assignees",
        sa.Column("task_id", sa.String(length=26), nullable=False),
        sa.Column("member_id", sa.String(length=26), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["members.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("task_id", "member_id"),
    )
    op.create_index(
        op.f("ix_task_assignees_task_id"),
        "task_assignees",
        ["task_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_task_assignees_member_id"),
        "task_assignees",
        ["member_id"],
        unique=False,
    )

    # 2. Backfill existing task assignees from tasks.assignee_id
    op.execute(
        """
        INSERT INTO task_assignees (task_id, member_id, created_at)
        SELECT id, assignee_id, COALESCE(created_at, now())
        FROM tasks
        WHERE assignee_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_task_assignees_member_id"), table_name="task_assignees")
    op.drop_index(op.f("ix_task_assignees_task_id"), table_name="task_assignees")
    op.drop_table("task_assignees")
