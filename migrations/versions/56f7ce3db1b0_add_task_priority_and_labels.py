"""add_task_priority_and_labels

Revision ID: 56f7ce3db1b0
Revises: ef5922d78d44
Create Date: 2026-09-06 09:09:26.490628

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "56f7ce3db1b0"
down_revision: str | None = "ef5922d78d44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create workspace_labels table
    op.create_table(
        "workspace_labels",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("workspace_id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id", "name", name="uq_workspace_label_workspace_name"
        ),
    )
    op.create_index(
        op.f("ix_workspace_labels_workspace_id"),
        "workspace_labels",
        ["workspace_id"],
        unique=False,
    )

    # 2. Add priority and labels to tasks table
    op.add_column(
        "tasks",
        sa.Column(
            "priority", sa.String(length=20), server_default="MEDIUM", nullable=False
        ),
    )
    op.add_column(
        "tasks", sa.Column("labels", sa.JSON(), server_default="[]", nullable=False)
    )
    op.create_index(op.f("ix_tasks_priority"), "tasks", ["priority"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tasks_priority"), table_name="tasks")
    op.drop_column("tasks", "labels")
    op.drop_column("tasks", "priority")
    op.drop_index(
        op.f("ix_workspace_labels_workspace_id"), table_name="workspace_labels"
    )
    op.drop_table("workspace_labels")
