"""create ai run and outbox tables

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
        "CANCELLED",
        name="ai_run_status",
        create_type=False,
    )
    ai_run_status.create(op.get_bind(), checkfirst=False)

    op.create_unique_constraint(
        "uq_projects_id_owner_id",
        "projects",
        ["id", "owner_id"],
    )

    op.create_table(
        "ai_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=128), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("base_canvas_revision", sa.String(length=255), nullable=True),
        sa.Column("input_canvas_path", sa.String(length=1024), nullable=True),
        sa.Column(
            "status",
            ai_run_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("stage", sa.String(length=255), nullable=True),
        sa.Column("proposal_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_code", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("claim_token", sa.String(length=255), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cancellation_requested_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("applied_canvas_revision", sa.String(length=255), nullable=True),
        sa.Column("model_name", sa.String(length=255), nullable=True),
        sa.Column("prompt_version", sa.String(length=255), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id", "owner_id"],
            ["projects.id", "projects.owner_id"],
            ondelete="CASCADE",
            name="fk_ai_runs_project_owner",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_id",
            "project_id",
            "idempotency_key",
            name="uq_ai_runs_owner_project_idempotency_key",
        ),
    )
    op.create_index(
        "ix_ai_runs_project_id_created_at",
        "ai_runs",
        ["project_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_runs_owner_project_id",
        "ai_runs",
        ["owner_id", "project_id"],
        unique=False,
    )
    op.create_index(
        "ix_ai_runs_expired_running_leases",
        "ai_runs",
        ["lease_expires_at"],
        unique=False,
        postgresql_where=sa.text(
            "status = 'RUNNING' AND lease_expires_at IS NOT NULL"
        ),
    )

    op.create_table(
        "ai_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delivery_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "next_attempt_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["ai_runs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id"),
    )
    op.create_index(
        "ix_ai_outbox_undelivered_next_attempt",
        "ai_outbox",
        ["next_attempt_at"],
        unique=False,
        postgresql_where=sa.text("delivered_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_ai_outbox_undelivered_next_attempt", table_name="ai_outbox")
    op.drop_table("ai_outbox")
    op.drop_index("ix_ai_runs_expired_running_leases", table_name="ai_runs")
    op.drop_index("ix_ai_runs_owner_project_id", table_name="ai_runs")
    op.drop_index("ix_ai_runs_project_id_created_at", table_name="ai_runs")
    op.drop_table("ai_runs")
    op.drop_constraint("uq_projects_id_owner_id", "projects", type_="unique")
    postgresql.ENUM(
        "PENDING",
        "RUNNING",
        "SUCCEEDED",
        "FAILED",
        "CANCELLED",
        name="ai_run_status",
        create_type=False,
    ).drop(op.get_bind(), checkfirst=False)
