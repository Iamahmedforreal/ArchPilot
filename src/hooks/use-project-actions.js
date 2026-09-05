import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@clerk/react"

import {
  createProject,
  deleteProject,
  fetchProjects,
  renameProject,
} from "@/lib/project-api"

function createSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function createRoomId(name, suffix) {
  const slug = createSlug(name) || "untitled-project"

  return `${slug}-${suffix}`
}

function createShortSuffix() {
  return Math.random().toString(36).slice(2, 8)
}

function normalizeProject(project) {
  const roomId = createRoomId(project.name, project.id)

  return {
    ...project,
    id: String(project.id),
    apiId: project.id,
    owned: true,
    roomId,
    slug: roomId,
  }
}

async function getSessionToken(getToken) {
  return getToken()
}

async function loadOwnedProjects(userId, getToken) {
  if (!userId || !getToken) {
    return []
  }

  const token = await getSessionToken(getToken)
  if (!token) {
    return []
  }

  const projects = await fetchProjects(token)

  return projects.map(normalizeProject)
}

function useProjectActions(activeWorkspaceId) {
  const { getToken, userId } = useAuth()
  const [dialog, setDialog] = useState({ type: null, project: null })
  const [projectName, setProjectName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [ownedProjects, setOwnedProjects] = useState([])
  const [sharedProjects] = useState([])
  const [createSuffix, setCreateSuffix] = useState(() => createShortSuffix())

  const roomIdPreview = useMemo(
    () => createRoomId(projectName, createSuffix),
    [createSuffix, projectName]
  )

  const refreshProjects = useCallback(async () => {
    setOwnedProjects(await loadOwnedProjects(userId, getToken))
  }, [getToken, userId])

  useEffect(() => {
    let ignore = false

    loadOwnedProjects(userId, getToken).then((projects) => {
      if (!ignore) {
        setOwnedProjects(projects)
      }
    })

    return () => {
      ignore = true
    }
  }, [getToken, userId])

  function openCreateDialog() {
    setProjectName("")
    setCreateSuffix(createShortSuffix())
    setDialog({ type: "create", project: null })
  }

  function openRenameDialog(project) {
    setProjectName(project.name)
    setDialog({ type: "rename", project })
  }

  function openDeleteDialog(project) {
    setProjectName(project.name)
    setDialog({ type: "delete", project })
  }

  function closeDialog() {
    setDialog({ type: null, project: null })
    setProjectName("")
    setIsLoading(false)
  }

  async function submitDialog() {
    if (!userId || !getToken || isLoading) {
      return
    }

    setIsLoading(true)
    const token = await getSessionToken(getToken)
    if (!token) {
      setIsLoading(false)
      return
    }

    if (dialog.type === "create") {
      const createdProject = await createProject(token, projectName.trim() || null)
      const nextWorkspaceId = createRoomId(createdProject.name, createdProject.id)
      closeDialog()
      window.location.assign(`/editor/${nextWorkspaceId}`)
      return
    }

    if (dialog.type === "rename" && dialog.project) {
      await renameProject(token, dialog.project.apiId, projectName.trim())
      await refreshProjects()
      closeDialog()
      return
    }

    if (dialog.type === "delete" && dialog.project) {
      const deletedProject = dialog.project
      await deleteProject(token, deletedProject.apiId)
      closeDialog()

      if (
        activeWorkspaceId === deletedProject.roomId ||
        activeWorkspaceId === deletedProject.id
      ) {
        window.location.assign("/editor")
        return
      }

      await refreshProjects()
      return
    }

    closeDialog()
  }

  return {
    dialog,
    isLoading,
    ownedProjects,
    projectName,
    roomIdPreview,
    setProjectName,
    sharedProjects,
    closeDialog,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    refreshProjects,
    submitDialog,
  }
}

export { useProjectActions }
