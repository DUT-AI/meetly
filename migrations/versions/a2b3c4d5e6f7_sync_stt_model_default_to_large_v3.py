"""sync_stt_model_default_to_large_v3

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-10-01 17:35:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: str | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Update default value of stt_model column to Systran/faster-whisper-large-v3
    op.alter_column(
        "transcription_sessions",
        "stt_model",
        existing_type=sa.String(100),
        server_default="Systran/faster-whisper-large-v3",
        existing_nullable=False,
    )
    # Synchronize legacy records to reflect actual GPU model used
    op.execute(
        "UPDATE transcription_sessions SET stt_model = 'Systran/faster-whisper-large-v3' "
        "WHERE stt_model IN ('openai/whisper-small', 'small')"
    )


def downgrade() -> None:
    op.alter_column(
        "transcription_sessions",
        "stt_model",
        existing_type=sa.String(100),
        server_default="openai/whisper-small",
        existing_nullable=False,
    )
