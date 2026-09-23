import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from model.project import Base, Project


class AIRunStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class AIRunKind(str, enum.Enum):
    DESIGN = "DESIGN"
    SPEC = "SPEC"


class FileBlob(Base):
    __tablename__ = "files_blob"
    __table_args__ = (
        Index("ix_files_blob_project_id", "project_id"),
        Index("ix_files_blob_blob_url", "blob_url"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    blob_url: Mapped[str] = mapped_column(String(1024), nullable=False)

    project: Mapped[Project] = relationship()


class AIRun(Base):
    __tablename__ = "ai_runs"
    __table_args__ = (
        Index("ix_ai_runs_project_id_created_at", "project_id", "created_at"),
        Index(
            "ix_ai_runs_project_active_status",
            "project_id",
            "status",
            postgresql_where=text("status IN ('PENDING', 'RUNNING')"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[AIRunKind] = mapped_column(
        Enum(AIRunKind, name="ai_run_kind"),
        nullable=False,
        default=AIRunKind.DESIGN,
        server_default=AIRunKind.DESIGN.value,
    )
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AIRunStatus] = mapped_column(
        Enum(AIRunStatus, name="ai_run_status"),
        nullable=False,
        default=AIRunStatus.PENDING,
        server_default=AIRunStatus.PENDING.value,
    )
    stage: Mapped[str | None] = mapped_column(String(255), nullable=True)
    proposal_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_canvas_revision: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    base_canvas_revision: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    input_canvas_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    file_blob_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("files_blob.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    project: Mapped[Project] = relationship()
    file_blob: Mapped[FileBlob | None] = relationship()
