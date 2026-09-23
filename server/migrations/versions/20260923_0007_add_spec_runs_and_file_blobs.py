"""add spec runs and file blobs

Revision ID: 20260923_0007
Revises: 20260918_0006
Create Date: 2026-09-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260923_0007"
down_revision: Union[str, Sequence[str], None] = "20260918_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    ai_run_kind = postgresql.ENUM("DESIGN", "SPEC", name="ai_run_kind")
    ai_run_kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "files_blob",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("blob_url", sa.String(length=1024), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_files_blob_project_id", "files_blob", ["project_id"])
    op.create_index("ix_files_blob_blob_url", "files_blob", ["blob_url"])

    op.add_column(
        "ai_runs",
        sa.Column(
            "kind",
            ai_run_kind,
            nullable=False,
            server_default="DESIGN",
        ),
    )
    op.add_column(
        "ai_runs",
        sa.Column("base_canvas_revision", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "ai_runs",
        sa.Column("input_canvas_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "ai_runs",
        sa.Column("file_blob_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_ai_runs_file_blob_id_files_blob",
        "ai_runs",
        "files_blob",
        ["file_blob_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column("ai_runs", "kind", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_ai_runs_file_blob_id_files_blob", "ai_runs", type_="foreignkey")
    op.drop_column("ai_runs", "file_blob_id")
    op.drop_column("ai_runs", "input_canvas_json")
    op.drop_column("ai_runs", "base_canvas_revision")
    op.drop_column("ai_runs", "kind")
    op.drop_index("ix_files_blob_blob_url", table_name="files_blob")
    op.drop_index("ix_files_blob_project_id", table_name="files_blob")
    op.drop_table("files_blob")
    op.execute("DROP TYPE ai_run_kind")
