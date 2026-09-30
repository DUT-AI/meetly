"""create_member_voice_profiles_table

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
Create Date: 2026-10-01 06:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "member_voice_profiles",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("workspace_id", sa.String(length=26), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("member_name", sa.String(length=255), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "centroid_vector",
            sa.JSON().with_variant(
                postgresql.JSONB(astext_type=sa.Text()), "postgresql"
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_member_voice_profiles_workspace_id"),
        "member_voice_profiles",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_member_voice_profiles_user_id"),
        "member_voice_profiles",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "uq_member_voice_profiles_workspace_user",
        "member_voice_profiles",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_member_voice_profiles_workspace_user",
        table_name="member_voice_profiles",
    )
    op.drop_index(
        op.f("ix_member_voice_profiles_user_id"),
        table_name="member_voice_profiles",
    )
    op.drop_index(
        op.f("ix_member_voice_profiles_workspace_id"),
        table_name="member_voice_profiles",
    )
    op.drop_table("member_voice_profiles")
