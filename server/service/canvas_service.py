import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from vercel.blob import AsyncBlobClient, BlobError, BlobNotFoundError

from model.project import Project
from utils.utils import settings


class CanvasStorageError(Exception):
    pass


class CanvasNotFoundError(CanvasStorageError):
    pass


def get_canvas_blob_token() -> str:
    if not settings.blob_read_write_token:
        raise CanvasStorageError("Vercel Blob is not configured")

    return settings.blob_read_write_token


async def save_project_canvas(
    session: AsyncSession,
    project: Project,
    canvas_state: dict[str, Any],
) -> str:
    payload = json.dumps(canvas_state, separators=(",", ":"))

    try:
        async with AsyncBlobClient(token=get_canvas_blob_token()) as client:
            blob = await client.put(
                f"canvas/{project.id}.json",
                payload,
                access="private",
                content_type="application/json",
                overwrite=True,
            )
    except BlobError as exc:
        raise CanvasStorageError("Unable to save the canvas") from exc

    project.canvas_json_path = blob.url
    await session.commit()
    return blob.url


async def load_project_canvas(project: Project) -> dict[str, Any] | None:
    if not project.canvas_json_path:
        return None

    try:
        async with AsyncBlobClient(token=get_canvas_blob_token()) as client:
            blob = await client.get(project.canvas_json_path, access="private")
    except BlobNotFoundError as exc:
        raise CanvasNotFoundError("Saved canvas was not found") from exc
    except BlobError as exc:
        raise CanvasStorageError("Unable to load the canvas") from exc

    try:
        canvas_state = json.loads(blob.content)
    except (TypeError, json.JSONDecodeError) as exc:
        raise CanvasStorageError("Saved canvas is invalid") from exc

    if not isinstance(canvas_state, dict):
        raise CanvasStorageError("Saved canvas is invalid")

    return canvas_state
