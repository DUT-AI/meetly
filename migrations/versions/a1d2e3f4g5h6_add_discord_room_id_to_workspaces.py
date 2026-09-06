"""add_discord_room_id_to_workspaces

Revision ID: a1d2e3f4g5h6
Revises: 99c3d4e5f6a7
Create Date: 2026-09-06 15:48:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1d2e3f4g5h6"
down_revision: str | None = "99c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspaces", sa.Column("discord_room_id", sa.String(64), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("workspaces", "discord_room_id")
