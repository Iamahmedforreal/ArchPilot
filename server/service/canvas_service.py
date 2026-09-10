import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from vercel.blob import AsyncBlobClient, BlobError, BlobNotFoundError

from model.project import Project
from utils.utils import settings


class CanvasStorageError(Exception):
    pass


class CanvasNotFoundError(CanvasStorageError):
    pass


class CanvasRevisionConflictError(CanvasStorageError):
    pass


def get_canvas_blob_token() -> str:
    if not settings.blob_read_write_token:
        raise CanvasStorageError("Vercel Blob is not configured")

    return settings.blob_read_write_token


def _validate_canvas_state(canvas_state: Any) -> dict[str, Any]:
    if not isinstance(canvas_state, dict):
        raise CanvasStorageError("Saved canvas is invalid")

    return canvas_state


async def _get_canvas_blob(
    client: AsyncBlobClient,
    canvas_json_path: str,
):
    return await client.get(
        canvas_json_path,
        access="private",
        use_cache=False,
    )


async def save_project_canvas(
    session: AsyncSession,
    project_id: int,
    owner_id: str,
    canvas_state: dict[str, Any],
    expected_revision: str | None,
) -> tuple[str, str]:
    payload = json.dumps(canvas_state, separators=(",", ":"))

    try:
        locked_project = await session.scalar(
            select(Project)
            .where(Project.id == project_id, Project.owner_id == owner_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if locked_project is None:
            raise CanvasNotFoundError("Project not found")

        async with AsyncBlobClient(token=get_canvas_blob_token()) as client:
            current_revision = None
            if locked_project.canvas_json_path:
                try:
                    current_blob = await _get_canvas_blob(
                        client,
                        locked_project.canvas_json_path,
                    )
                    current_revision = current_blob.etag
                except BlobNotFoundError as exc:
                    raise CanvasNotFoundError("Saved canvas was not found") from exc

            if expected_revision != current_revision:
                raise CanvasRevisionConflictError("Canvas revision has changed")

            blob = await client.put(
                f"canvas/{locked_project.id}.json",
                payload,
                access="private",
                content_type="application/json",
                overwrite=True,
            )
            saved_blob = await _get_canvas_blob(client, blob.url)
    except BlobError as exc:
        raise CanvasStorageError("Unable to save the canvas") from exc

    locked_project.canvas_json_path = blob.url
    await session.commit()
    return blob.url, saved_blob.etag


async def load_project_canvas(project: Project) -> tuple[dict[str, Any], str] | None:
    if not project.canvas_json_path:
        return None

    try:
        async with AsyncBlobClient(token=get_canvas_blob_token()) as client:
            blob = await _get_canvas_blob(client, project.canvas_json_path)
    except BlobNotFoundError as exc:
        raise CanvasNotFoundError("Saved canvas was not found") from exc
    except BlobError as exc:
        raise CanvasStorageError("Unable to load the canvas") from exc

    try:
        canvas_state = json.loads(blob.content)
    except (TypeError, json.JSONDecodeError) as exc:
        raise CanvasStorageError("Saved canvas is invalid") from exc

    return _validate_canvas_state(canvas_state), blob.etag
