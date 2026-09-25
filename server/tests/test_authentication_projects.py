import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException

from model.project import ProjectStatus
from routes.auth import get_current_identity
from service.project_service import (
    ProjectForbiddenError,
    create_project,
    rename_project,
)


class AuthenticationAndProjectsTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_authentication_is_rejected(self):
        request = SimpleNamespace(headers={}, cookies={})

        with self.assertRaises(HTTPException) as raised:
            await get_current_identity(request)

        self.assertEqual(raised.exception.status_code, 401)

    async def test_create_project_uses_default_name_and_serializes_owner_data(self):
        session = MagicMock()
        session.commit = AsyncMock()
        project = None

        async def refresh(created_project):
            nonlocal project
            project = created_project
            created_project.id = 1
            created_project.description = None
            created_project.status = ProjectStatus.DRAFT
            created_project.canvas_json_path = None
            created_project.created_at = datetime.now(timezone.utc)
            created_project.updated_at = created_project.created_at

        session.refresh = AsyncMock(side_effect=refresh)
        result = await create_project(session, "user-1", None)

        self.assertEqual(project.owner_id, "user-1")
        self.assertEqual(project.name, "Untitled Project")
        self.assertEqual(result["status"], "DRAFT")
        session.commit.assert_awaited_once_with()

    async def test_rename_rejects_a_project_owned_by_someone_else(self):
        session = MagicMock()
        session.get = AsyncMock(return_value=SimpleNamespace(owner_id="other-user"))

        with self.assertRaises(ProjectForbiddenError):
            await rename_project(session, "user-1", 7, "Renamed")


if __name__ == "__main__":
    unittest.main()
