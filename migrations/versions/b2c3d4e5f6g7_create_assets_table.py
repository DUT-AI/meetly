"""create_assets_table

Revision ID: b2c3d4e5f6g7
Revises: a1d2e3f4g5h6
Create Date: 2026-09-07 22:05:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6g7"
down_revision: str | None = "a1d2e3f4g5h6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("workspace_id", sa.String(length=26), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=26), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("bucket", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("extension", sa.String(length=20), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("metadata", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("uploaded_by", sa.String(length=26), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assets_workspace_id"), "assets", ["workspace_id"], unique=False
    )
    op.create_index(
        op.f("ix_assets_entity_type"), "assets", ["entity_type"], unique=False
    )
    op.create_index(op.f("ix_assets_entity_id"), "assets", ["entity_id"], unique=False)
    op.create_index(
        "ix_assets_entity", "assets", ["entity_type", "entity_id"], unique=False
    )
    op.create_index(op.f("ix_assets_category"), "assets", ["category"], unique=False)
    op.create_index(
        op.f("ix_assets_uploaded_by"), "assets", ["uploaded_by"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_assets_uploaded_by"), table_name="assets")
    op.drop_index(op.f("ix_assets_category"), table_name="assets")
    op.drop_index("ix_assets_entity", table_name="assets")
    op.drop_index(op.f("ix_assets_entity_id"), table_name="assets")
    op.drop_index(op.f("ix_assets_entity_type"), table_name="assets")
    op.drop_index(op.f("ix_assets_workspace_id"), table_name="assets")
    op.drop_table("assets")
