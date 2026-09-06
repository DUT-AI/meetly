"""create_task_comments_table

Revision ID: 77a1b2c3d4e5
Revises: 56f7ce3db1b0
Create Date: 2026-09-06 09:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "77a1b2c3d4e5"
down_revision: str | None = "56f7ce3db1b0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_comments",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("task_id", sa.String(length=26), nullable=False),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("mentions", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_task_comments_task_id"), "task_comments", ["task_id"], unique=False
    )
    op.create_index(
        op.f("ix_task_comments_user_id"), "task_comments", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_task_comments_user_id"), table_name="task_comments")
    op.drop_index(op.f("ix_task_comments_task_id"), table_name="task_comments")
    op.drop_table("task_comments")
