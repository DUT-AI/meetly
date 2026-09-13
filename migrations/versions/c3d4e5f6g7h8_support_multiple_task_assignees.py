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
    # 1. Add assignee_ids JSON column with default '[]'
    op.add_column(
        "tasks",
        sa.Column("assignee_ids", sa.JSON(), nullable=False, server_default="[]"),
    )

    # 2. Backfill existing task assignees from tasks.assignee_id
    op.execute(
        """
        UPDATE tasks
        SET assignee_ids = json_build_array(assignee_id)
        WHERE assignee_id IS NOT NULL;
        """
    )

    # 3. Drop index and drop assignee_id column from tasks
    op.drop_index(op.f("ix_tasks_assignee_id"), table_name="tasks")
    op.drop_column("tasks", "assignee_id")


def downgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("assignee_id", sa.String(length=26), nullable=True),
    )
    op.create_foreign_key(
        "tasks_assignee_id_fkey",
        "tasks",
        "members",
        ["assignee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_tasks_assignee_id"),
        "tasks",
        ["assignee_id"],
        unique=False,
    )
    op.execute(
        """
        UPDATE tasks
        SET assignee_id = assignee_ids->>0
        WHERE json_array_length(assignee_ids) > 0;
        """
    )
    op.drop_column("tasks", "assignee_ids")
