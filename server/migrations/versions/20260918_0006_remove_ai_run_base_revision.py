"""remove AI run base canvas revision

Revision ID: 20260918_0006
Revises: 20260918_0005
Create Date: 2026-09-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_0006"
down_revision: Union[str, Sequence[str], None] = "20260918_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("ai_runs", "base_canvas_revision")


def downgrade() -> None:
    op.add_column(
        "ai_runs",
        sa.Column("base_canvas_revision", sa.String(length=255), nullable=True),
    )
