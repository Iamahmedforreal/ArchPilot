"""drop redundant projects id index

Revision ID: 20260904_0002
Revises: 20260904_0001
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260904_0002"
down_revision: Union[str, Sequence[str], None] = "20260904_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_projects_id"), table_name="projects")


def downgrade() -> None:
    op.create_index(op.f("ix_projects_id"), "projects", ["id"], unique=False)
