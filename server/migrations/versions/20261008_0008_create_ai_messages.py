"""create ai messages table

Revision ID: 20261008_0008
Revises: 20260923_0007
Create Date: 2026-10-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20261008_0008"
down_revision: Union[str, Sequence[str], None] = "20260923_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ai_message_role = postgresql.ENUM(
        "USER",
        "ASSISTANT",
        name="ai_message_role",
        create_type=False,
    )
    ai_message_role.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "ai_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("role", ai_message_role, nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_messages_project_id_created_at",
        "ai_messages",
        ["project_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_messages_project_id_role",
        "ai_messages",
        ["project_id", "role"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_messages_project_id_role",
        table_name="ai_messages",
    )
    op.drop_index(
        "ix_ai_messages_project_id_created_at",
        table_name="ai_messages",
    )
    op.drop_table("ai_messages")
    postgresql.ENUM(
        "USER",
        "ASSISTANT",
        name="ai_message_role",
    ).drop(op.get_bind(), checkfirst=True)
