"""create ai conversation persistence tables

Revision ID: 20260914_0003
Revises: 20260904_0002
Create Date: 2026-09-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260914_0003"
down_revision: Union[str, Sequence[str], None] = "20260904_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    chat_message_role = postgresql.ENUM(
        "USER",
        "ASSISTANT",
        name="chat_message_role",
        create_type=False,
    )
    ai_run_status = postgresql.ENUM(
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "FAILED",
        "CANCELLED",
        name="ai_run_status",
        create_type=False,
    )
    chat_message_role.create(op.get_bind(), checkfirst=False)
    ai_run_status.create(op.get_bind(), checkfirst=False)

    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_conversations_created_at",
        "conversations",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_conversations_project_id",
        "conversations",
        ["project_id"],
        unique=False,
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", chat_message_role, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversation_id",
            "id",
            name="uq_chat_messages_conversation_id_id",
        ),
    )
    op.create_index(
        "ix_chat_messages_conversation_id",
        "chat_messages",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(
        "ix_chat_messages_created_at",
        "chat_messages",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "ai_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assistant_message_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            ai_run_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("base_canvas_revision", sa.String(length=255), nullable=True),
        sa.Column("proposed_changes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_code", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id", "user_message_id"],
            ["chat_messages.conversation_id", "chat_messages.id"],
            name="fk_ai_runs_user_message_conversation",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id", "assistant_message_id"],
            ["chat_messages.conversation_id", "chat_messages.id"],
            name="fk_ai_runs_assistant_message_conversation",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversation_id",
            "idempotency_key",
            name="uq_ai_runs_conversation_id_idempotency_key",
        ),
    )
    op.create_index("ix_ai_runs_conversation_id", "ai_runs", ["conversation_id"], unique=False)
    op.create_index("ix_ai_runs_status", "ai_runs", ["status"], unique=False)
    op.create_index("ix_ai_runs_user_message_id", "ai_runs", ["user_message_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_runs_user_message_id", table_name="ai_runs")
    op.drop_index("ix_ai_runs_status", table_name="ai_runs")
    op.drop_index("ix_ai_runs_conversation_id", table_name="ai_runs")
    op.drop_table("ai_runs")
    op.drop_index("ix_chat_messages_created_at", table_name="chat_messages")
    op.drop_index("ix_chat_messages_conversation_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_conversations_project_id", table_name="conversations")
    op.drop_index("ix_conversations_created_at", table_name="conversations")
    op.drop_table("conversations")
    postgresql.ENUM(
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "FAILED",
        "CANCELLED",
        name="ai_run_status",
        create_type=False,
    ).drop(op.get_bind(), checkfirst=False)
    postgresql.ENUM(
        "USER",
        "ASSISTANT",
        name="chat_message_role",
        create_type=False,
    ).drop(op.get_bind(), checkfirst=False)
