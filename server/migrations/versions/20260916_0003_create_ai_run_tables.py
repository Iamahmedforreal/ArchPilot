"""create ai run table

Revision ID: 20260916_0003
Revises: 20260904_0002
Create Date: 2026-09-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260916_0003"
down_revision: Union[str, Sequence[str], None] = "20260904_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ai_run_status = postgresql.ENUM(
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "FAILED",
        name="ai_run_status",
        create_type=False,
    )
    ai_run_status.create(op.get_bind(), checkfirst=False)

    op.create_table(
        "ai_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=128), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("base_canvas_revision", sa.String(length=255), nullable=True),
        sa.Column(
            "status",
            ai_run_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("result_canvas_revision", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id",
            "idempotency_key",
            name="uq_ai_runs_project_idempotency_key",
        ),
    )
    op.create_index(
        "ix_ai_runs_project_id_created_at",
        "ai_runs",
        ["project_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_runs_project_active_status",
        "ai_runs",
        ["project_id", "status"],
        unique=False,
        postgresql_where=sa.text("status IN ('PENDING', 'RUNNING')"),
    )


def downgrade() -> None:
    op.drop_index("ix_ai_runs_project_active_status", table_name="ai_runs")
    op.drop_index("ix_ai_runs_project_id_created_at", table_name="ai_runs")
    op.drop_table("ai_runs")
    postgresql.ENUM(
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "FAILED",
        name="ai_run_status",
        create_type=False,
    ).drop(op.get_bind(), checkfirst=False)
