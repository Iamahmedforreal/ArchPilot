"""add AI clarification answers and restore design revision tracking

Revision ID: 20261017_0010
Revises: 20261008_0009
Create Date: 2026-10-17
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261017_0010"
down_revision: Union[str, Sequence[str], None] = "20261008_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS "
        "base_canvas_revision VARCHAR(255)"
    )
    op.execute(
        "ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS "
        "clarification_answers JSONB"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE ai_runs DROP COLUMN IF EXISTS clarification_answers")
    op.execute("ALTER TABLE ai_runs DROP COLUMN IF EXISTS base_canvas_revision")
