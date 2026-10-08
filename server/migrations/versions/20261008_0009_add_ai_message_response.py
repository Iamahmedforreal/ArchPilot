"""add AI response and run link to messages

Revision ID: 20261008_0009
Revises: 20261008_0008
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20261008_0009"
down_revision: Union[str, Sequence[str], None] = "20261008_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_messages",
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "ai_messages",
        sa.Column("response", sa.Text(), nullable=True),
    )
    op.create_foreign_key(
        "fk_ai_messages_run_id_ai_runs",
        "ai_messages",
        "ai_runs",
        ["run_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_ai_messages_run_id",
        "ai_messages",
        ["run_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_ai_messages_run_id", table_name="ai_messages")
    op.drop_constraint(
        "fk_ai_messages_run_id_ai_runs",
        "ai_messages",
        type_="foreignkey",
    )
    op.drop_column("ai_messages", "response")
    op.drop_column("ai_messages", "run_id")
