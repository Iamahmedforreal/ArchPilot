"""sync ai run message conversation constraints

Revision ID: 20260915_0004
Revises: 20260914_0003
Create Date: 2026-09-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260915_0004"
down_revision: Union[str, Sequence[str], None] = "20260914_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CHAT_MESSAGES_CONVERSATION_ID_ID = "uq_chat_messages_conversation_id_id"
AI_RUNS_USER_MESSAGE_CONVERSATION = "fk_ai_runs_user_message_conversation"
AI_RUNS_ASSISTANT_MESSAGE_CONVERSATION = "fk_ai_runs_assistant_message_conversation"


def _constraint_exists(constraints: list[dict], name: str) -> bool:
    return any(constraint.get("name") == name for constraint in constraints)


def _find_single_message_fk(
    constraints: list[dict],
    column_name: str,
) -> str | None:
    for constraint in constraints:
        if (
            constraint.get("referred_table") == "chat_messages"
            and constraint.get("constrained_columns") == [column_name]
            and constraint.get("referred_columns") == ["id"]
        ):
            return constraint.get("name")

    return None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    chat_message_unique_constraints = inspector.get_unique_constraints("chat_messages")
    inspector = sa.inspect(bind)
    ai_run_foreign_keys = inspector.get_foreign_keys("ai_runs")

    if not _constraint_exists(
        chat_message_unique_constraints,
        CHAT_MESSAGES_CONVERSATION_ID_ID,
    ):
        op.create_unique_constraint(
            CHAT_MESSAGES_CONVERSATION_ID_ID,
            "chat_messages",
            ["conversation_id", "id"],
        )

    user_message_fk = _find_single_message_fk(ai_run_foreign_keys, "user_message_id")
    if user_message_fk:
        op.drop_constraint(user_message_fk, "ai_runs", type_="foreignkey")

    assistant_message_fk = _find_single_message_fk(
        ai_run_foreign_keys,
        "assistant_message_id",
    )
    if assistant_message_fk:
        op.drop_constraint(assistant_message_fk, "ai_runs", type_="foreignkey")

    ai_run_foreign_keys = inspector.get_foreign_keys("ai_runs")

    if not _constraint_exists(ai_run_foreign_keys, AI_RUNS_USER_MESSAGE_CONVERSATION):
        op.create_foreign_key(
            AI_RUNS_USER_MESSAGE_CONVERSATION,
            "ai_runs",
            "chat_messages",
            ["conversation_id", "user_message_id"],
            ["conversation_id", "id"],
            ondelete="RESTRICT",
        )

    if not _constraint_exists(
        ai_run_foreign_keys,
        AI_RUNS_ASSISTANT_MESSAGE_CONVERSATION,
    ):
        op.create_foreign_key(
            AI_RUNS_ASSISTANT_MESSAGE_CONVERSATION,
            "ai_runs",
            "chat_messages",
            ["conversation_id", "assistant_message_id"],
            ["conversation_id", "id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    pass
