"""create projects table

Revision ID: 20260904_0001
Revises:
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260904_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE project_status AS ENUM ('DRAFT', 'ARCHIVED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    project_status = postgresql.ENUM(
        "DRAFT",
        "ARCHIVED",
        name="project_status",
        create_type=False,
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            project_status,
            server_default="DRAFT",
            nullable=False,
        ),
        sa.Column("canvasJsonPath", sa.String(length=1024), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_created_at", "projects", ["created_at"], unique=False)
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"], unique=False)
    op.create_index(op.f("ix_projects_id"), "projects", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_id"), table_name="projects")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_index("ix_projects_created_at", table_name="projects")
    op.drop_table("projects")
    sa.Enum("DRAFT", "ARCHIVED", name="project_status").drop(
        op.get_bind(),
        checkfirst=True,
    )
