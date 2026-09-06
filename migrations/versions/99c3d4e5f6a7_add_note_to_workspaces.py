"""add_note_to_workspaces

Revision ID: 99c3d4e5f6a7
Revises: 88b2c3d4e5f6
Create Date: 2026-09-06 15:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "99c3d4e5f6a7"
down_revision: str | None = "88b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("workspaces", sa.Column("note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("workspaces", "note")
