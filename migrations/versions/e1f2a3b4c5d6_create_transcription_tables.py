"""Create transcription tables

Revision ID: e1f2a3b4c5d6
Revises: d0e7dd90d5e0
Create Date: 2026-09-21 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d0e7dd90d5e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create transcription_sessions table
    op.create_table(
        "transcription_sessions",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("meeting_id", sa.String(length=26), nullable=False),
        sa.Column("workspace_id", sa.String(length=26), nullable=False),
        sa.Column(
            "status", sa.String(length=30), nullable=False, server_default="CREATED"
        ),
        sa.Column(
            "source_type",
            sa.String(length=30),
            nullable=False,
            server_default="GOOGLE_MEET",
        ),
        sa.Column("sample_rate", sa.Integer(), nullable=False, server_default="16000"),
        sa.Column(
            "duration_samples", sa.BigInteger(), nullable=False, server_default="0"
        ),
        sa.Column(
            "stt_model",
            sa.String(length=100),
            nullable=False,
            server_default="openai/whisper-small",
        ),
        sa.Column("recording_asset_id", sa.String(length=26), nullable=True),
        sa.Column("created_by", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["recording_asset_id"], ["assets.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_transcription_sessions_meeting_id"),
        "transcription_sessions",
        ["meeting_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transcription_sessions_workspace_id"),
        "transcription_sessions",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transcription_sessions_status"),
        "transcription_sessions",
        ["status"],
        unique=False,
    )

    # 2. Create transcript_segments table
    op.create_table(
        "transcript_segments",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("session_id", sa.String(length=26), nullable=False),
        sa.Column("utterance_id", sa.String(length=64), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("start_ms", sa.BigInteger(), nullable=False),
        sa.Column("end_ms", sa.BigInteger(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "words",
            sa.JSON().with_variant(
                postgresql.JSONB(astext_type=sa.Text()), "postgresql"
            ),
            nullable=False,
        ),
        sa.Column(
            "speaker_label",
            sa.String(length=50),
            nullable=False,
            server_default="UNKNOWN",
        ),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("is_final", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["session_id"], ["transcription_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_transcript_segments_session_id"),
        "transcript_segments",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transcript_segments_utterance_id"),
        "transcript_segments",
        ["utterance_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transcript_segments_is_final"),
        "transcript_segments",
        ["is_final"],
        unique=False,
    )
    op.create_index(
        "ix_transcript_segments_session_start",
        "transcript_segments",
        ["session_id", "start_ms"],
        unique=False,
    )
    op.create_index(
        "uq_transcript_segments_session_utterance",
        "transcript_segments",
        ["session_id", "utterance_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_transcript_segments_session_utterance", table_name="transcript_segments"
    )
    op.drop_index(
        "ix_transcript_segments_session_start", table_name="transcript_segments"
    )
    op.drop_index(
        op.f("ix_transcript_segments_is_final"), table_name="transcript_segments"
    )
    op.drop_index(
        op.f("ix_transcript_segments_utterance_id"), table_name="transcript_segments"
    )
    op.drop_index(
        op.f("ix_transcript_segments_session_id"), table_name="transcript_segments"
    )
    op.drop_table("transcript_segments")

    op.drop_index(
        op.f("ix_transcription_sessions_status"), table_name="transcription_sessions"
    )
    op.drop_index(
        op.f("ix_transcription_sessions_workspace_id"),
        table_name="transcription_sessions",
    )
    op.drop_index(
        op.f("ix_transcription_sessions_meeting_id"),
        table_name="transcription_sessions",
    )
    op.drop_table("transcription_sessions")
