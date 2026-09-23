from vercel.blob import AsyncBlobClient, BlobError, BlobNotFoundError

from model.ai import FileBlob
from service.canvas_service import get_canvas_blob_token


class FileBlobStorageError(Exception):
    pass


class FileBlobNotFoundError(FileBlobStorageError):
    pass


async def save_markdown_file(path: str, markdown: str) -> str:
    try:
        async with AsyncBlobClient(token=get_canvas_blob_token()) as client:
            blob = await client.put(
                path,
                markdown.encode("utf-8"),
                access="private",
                content_type="text/markdown; charset=utf-8",
                overwrite=True,
            )
    except BlobError as exc:
        raise FileBlobStorageError("Unable to save generated spec") from exc

    return blob.url


async def load_markdown_file(file_blob: FileBlob) -> bytes:
    try:
        async with AsyncBlobClient(token=get_canvas_blob_token()) as client:
            blob = await client.get(
                file_blob.blob_url,
                access="private",
                use_cache=False,
            )
    except BlobNotFoundError as exc:
        raise FileBlobNotFoundError("Generated spec was not found") from exc
    except BlobError as exc:
        raise FileBlobStorageError("Unable to load generated spec") from exc

    content = blob.content
    if isinstance(content, bytes):
        return content
    if isinstance(content, str):
        return content.encode("utf-8")

    raise FileBlobStorageError("Generated spec is invalid")
