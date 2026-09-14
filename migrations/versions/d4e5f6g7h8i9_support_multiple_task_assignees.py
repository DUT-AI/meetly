"""support_multiple_task_assignees

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-09-13 11:35:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d4e5f6g7h8i9"
down_revision: str | None = "c3d4e5f6g7h8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Drop legacy junction table if it was created during early prototype testing
    op.execute("DROP TABLE IF EXISTS task_assignees CASCADE;")

    # 2. Define assignee_ids type with PostgreSQL JSONB variant for GIN indexing
    assignee_ids_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    # 3. Create tasks_new table with clean schema (only assignee_ids, no single assignee_id)
    op.create_table(
        "tasks_new",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("workspace_id", sa.String(length=26), nullable=False),
        sa.Column("project_id", sa.String(length=26), nullable=False),
        sa.Column("assignee_ids", assignee_ids_type, server_default="[]", nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), server_default="MEDIUM", nullable=False),
        sa.Column("labels", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # 4. Copy existing data from tasks to tasks_new with assignee transformation
    if is_postgres:
        op.execute(
            """
            INSERT INTO tasks_new (
                id, name, status, workspace_id, project_id,
                assignee_ids, due_date, position, description,
                priority, labels, created_at, updated_at
            )
            SELECT
                id, name, status, workspace_id, project_id,
                CASE
                    WHEN assignee_id IS NOT NULL THEN jsonb_build_array(assignee_id)
                    ELSE '[]'::jsonb
                END,
                due_date, position, description,
                priority, labels, created_at, updated_at
            FROM tasks;
            """
        )
    else:
        op.execute(
            """
            INSERT INTO tasks_new (
                id, name, status, workspace_id, project_id,
                assignee_ids, due_date, position, description,
                priority, labels, created_at, updated_at
            )
            SELECT
                id, name, status, workspace_id, project_id,
                CASE
                    WHEN assignee_id IS NOT NULL THEN json_array(assignee_id)
                    ELSE '[]'
                END,
                due_date, position, description,
                priority, labels, created_at, updated_at
            FROM tasks;
            """
        )

    # 5. Swap tables: drop old tasks table and rename tasks_new to tasks
    if is_postgres:
        op.execute("ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey;")
        op.execute("DROP TABLE tasks CASCADE;")
        op.execute("ALTER TABLE tasks_new RENAME TO tasks;")
        op.execute("ALTER TABLE tasks RENAME CONSTRAINT tasks_new_pkey TO tasks_pkey;")
        op.execute(
            """
            ALTER TABLE task_comments
            ADD CONSTRAINT task_comments_task_id_fkey
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
            """
        )
    else:
        op.execute("DROP TABLE tasks;")
        op.execute("ALTER TABLE tasks_new RENAME TO tasks;")

    # 6. Recreate indexes on tasks
    op.create_index(op.f("ix_tasks_workspace_id"), "tasks", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_tasks_project_id"), "tasks", ["project_id"], unique=False)
    op.create_index(op.f("ix_tasks_status"), "tasks", ["status"], unique=False)
    op.create_index(op.f("ix_tasks_priority"), "tasks", ["priority"], unique=False)

    if is_postgres:
        op.create_index(
            "ix_tasks_assignee_ids",
            "tasks",
            ["assignee_ids"],
            postgresql_using="gin",
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Create tasks_old table with legacy schema (assignee_id column, no assignee_ids)
    op.create_table(
        "tasks_old",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("workspace_id", sa.String(length=26), nullable=False),
        sa.Column("project_id", sa.String(length=26), nullable=False),
        sa.Column("assignee_id", sa.String(length=26), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), server_default="MEDIUM", nullable=False),
        sa.Column("labels", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assignee_id"], ["members.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. Copy data back: extract first assignee from assignee_ids into assignee_id
    if is_postgres:
        op.execute(
            """
            INSERT INTO tasks_old (
                id, name, status, workspace_id, project_id,
                assignee_id, due_date, position, description,
                priority, labels, created_at, updated_at
            )
            SELECT
                id, name, status, workspace_id, project_id,
                assignee_ids->>0,
                due_date, position, description,
                priority, labels, created_at, updated_at
            FROM tasks;
            """
        )
    else:
        op.execute(
            """
            INSERT INTO tasks_old (
                id, name, status, workspace_id, project_id,
                assignee_id, due_date, position, description,
                priority, labels, created_at, updated_at
            )
            SELECT
                id, name, status, workspace_id, project_id,
                json_extract(assignee_ids, '$[0]'),
                due_date, position, description,
                priority, labels, created_at, updated_at
            FROM tasks;
            """
        )

    # 3. Swap tables back
    if is_postgres:
        op.execute("ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey;")
        op.execute("DROP TABLE tasks CASCADE;")
        op.execute("ALTER TABLE tasks_old RENAME TO tasks;")
        op.execute("ALTER TABLE tasks RENAME CONSTRAINT tasks_old_pkey TO tasks_pkey;")
        op.execute(
            """
            ALTER TABLE task_comments
            ADD CONSTRAINT task_comments_task_id_fkey
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
            """
        )
    else:
        op.execute("DROP TABLE tasks;")
        op.execute("ALTER TABLE tasks_old RENAME TO tasks;")

    # 4. Recreate legacy indexes
    op.create_index(op.f("ix_tasks_workspace_id"), "tasks", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_tasks_project_id"), "tasks", ["project_id"], unique=False)
    op.create_index(op.f("ix_tasks_status"), "tasks", ["status"], unique=False)
    op.create_index(op.f("ix_tasks_priority"), "tasks", ["priority"], unique=False)
    op.create_index(op.f("ix_tasks_assignee_id"), "tasks", ["assignee_id"], unique=False)
