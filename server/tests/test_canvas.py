import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from service.canvas_service import (
    CanvasRevisionConflictError,
    _validate_canvas_state,
    save_project_canvas,
)


class FakeBlobClient:
    def __init__(self):
        self.get_count = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, _path, **_kwargs):
        self.get_count += 1
        return SimpleNamespace(etag="rev-1" if self.get_count == 1 else "rev-2")

    async def put(self, _path, _payload, **_kwargs):
        return SimpleNamespace(url="blob://canvas/7")


class CanvasTests(unittest.IsolatedAsyncioTestCase):
    def test_canvas_state_must_be_an_object(self):
        with self.assertRaisesRegex(Exception, "Saved canvas is invalid"):
            _validate_canvas_state([])

    async def test_save_rejects_a_stale_revision_before_writing(self):
        project = SimpleNamespace(id=7, owner_id="user-1", canvas_json_path="blob://old")
        session = MagicMock()
        session.scalar = AsyncMock(return_value=project)
        session.commit = AsyncMock()
        client = FakeBlobClient()

        with (
            patch("service.canvas_service.get_canvas_blob_token", return_value="blob-token"),
            patch("service.canvas_service.AsyncBlobClient", return_value=client),
        ):
            with self.assertRaises(CanvasRevisionConflictError):
                await save_project_canvas(
                    session,
                    7,
                    "user-1",
                    {"nodes": [], "edges": []},
                    "old-revision",
                )

        self.assertEqual(client.get_count, 1)
        session.commit.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
