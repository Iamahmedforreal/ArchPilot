"""remove AI run idempotency fields

Revision ID: 20260918_0004
Revises: 20260916_0003
Create Date: 2026-09-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_0004"
down_revision: Union[str, Sequence[str], None] = "20260916_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {
        column["name"] for column in inspector.get_columns("ai_runs")
    }

    op.drop_column("ai_runs", "request_hash")
    op.drop_column("ai_runs", "idempotency_key")

    # Some development databases ran an older version of revision 0003 before
    # it was simplified. Bring those stamped schemas back to the current model.
    legacy_columns = (
        "owner_id",
        "input_canvas_path",
        "stage",
        "proposal_json",
        "attempt_count",
        "claim_token",
        "lease_expires_at",
        "cancellation_requested_at",
        "applied_canvas_revision",
        "model_name",
        "prompt_version",
        "input_tokens",
        "output_tokens",
    )
    for column_name in legacy_columns:
        if column_name in column_names:
            op.drop_column("ai_runs", column_name)

    if "explanation" not in column_names:
        op.add_column(
            "ai_runs",
            sa.Column("explanation", sa.Text(), nullable=True),
        )
    if "result_canvas_revision" not in column_names:
        op.add_column(
            "ai_runs",
            sa.Column(
                "result_canvas_revision",
                sa.String(length=255),
                nullable=True,
            ),
        )

    index_names = {
        index["name"] for index in sa.inspect(bind).get_indexes("ai_runs")
    }
    if "ix_ai_runs_project_active_status" not in index_names:
        op.create_index(
            "ix_ai_runs_project_active_status",
            "ai_runs",
            ["project_id", "status"],
            unique=False,
            postgresql_where=sa.text("status IN ('PENDING', 'RUNNING')"),
        )


def downgrade() -> None:
    op.add_column(
        "ai_runs",
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "ai_runs",
        sa.Column("request_hash", sa.String(length=128), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE ai_runs "
            "SET idempotency_key = 'legacy:' || id::text, "
            "request_hash = repeat('0', 64)"
        )
    )
    op.alter_column("ai_runs", "idempotency_key", nullable=False)
    op.alter_column("ai_runs", "request_hash", nullable=False)
    op.create_unique_constraint(
        "uq_ai_runs_project_idempotency_key",
        "ai_runs",
        ["project_id", "idempotency_key"],
    )
