"""add AI run progress and result fields

Revision ID: 20260918_0005
Revises: 20260918_0004
Create Date: 2026-09-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260918_0005"
down_revision: Union[str, Sequence[str], None] = "20260918_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE ai_run_status ADD VALUE IF NOT EXISTS 'CANCELLED'")
    op.add_column(
        "ai_runs",
        sa.Column("stage", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "ai_runs",
        sa.Column("proposal_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ai_runs", "proposal_json")
    op.drop_column("ai_runs", "stage")
    op.execute("UPDATE ai_runs SET status = 'FAILED' WHERE status = 'CANCELLED'")
    op.drop_index("ix_ai_runs_project_active_status", table_name="ai_runs")
    op.execute("ALTER TABLE ai_runs ALTER COLUMN status DROP DEFAULT")

    previous_status = postgresql.ENUM(
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "FAILED",
        name="ai_run_status_previous",
    )
    previous_status.create(op.get_bind(), checkfirst=False)
    op.execute(
        "ALTER TABLE ai_runs ALTER COLUMN status "
        "TYPE ai_run_status_previous USING status::text::ai_run_status_previous"
    )
    op.execute("DROP TYPE ai_run_status")
    op.execute("ALTER TYPE ai_run_status_previous RENAME TO ai_run_status")
    op.execute("ALTER TABLE ai_runs ALTER COLUMN status SET DEFAULT 'PENDING'")
    op.create_index(
        "ix_ai_runs_project_active_status",
        "ai_runs",
        ["project_id", "status"],
        unique=False,
        postgresql_where=sa.text("status IN ('PENDING', 'RUNNING')"),
    )
