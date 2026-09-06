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

function createRoomId(projectId) {
  return String(projectId)
}

function createShortSuffix() {
  return Math.random().toString(36).slice(2, 8)
}

const ownedProjectsCache = new Map()
const ownedProjectsRequests = new Map()

function normalizeProject(project) {
  const roomId = createRoomId(project.id)

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

function setCachedOwnedProjects(userId, projects) {
  ownedProjectsCache.set(userId, projects)
}

function removeCachedOwnedProject(userId, projectId) {
  if (!ownedProjectsCache.has(userId)) {
    return
  }

  setCachedOwnedProjects(
    userId,
    ownedProjectsCache
      .get(userId)
      .filter((project) => project.apiId !== projectId)
  )
}

async function loadOwnedProjects(userId, getToken, { force = false } = {}) {
  if (!userId || !getToken) {
    return []
  }

  if (!force && ownedProjectsCache.has(userId)) {
    return ownedProjectsCache.get(userId)
  }

  if (!force && ownedProjectsRequests.has(userId)) {
    return ownedProjectsRequests.get(userId)
  }

  const request = loadOwnedProjectsFromApi(userId, getToken)
  ownedProjectsRequests.set(userId, request)

  try {
    const projects = await request
    setCachedOwnedProjects(userId, projects)
    return projects
  } finally {
    ownedProjectsRequests.delete(userId)
  }
}

async function loadOwnedProjectsFromApi(userId, getToken) {
  const token = await getSessionToken(getToken)
  if (!token) {
    return []
  }

  const projects = await fetchProjects(token)

  return projects.map(normalizeProject)
}

function useProjectActions(activeWorkspaceId, navigate) {
  const { getToken, userId } = useAuth()
  const [dialog, setDialog] = useState({ type: null, project: null })
  const [projectName, setProjectName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [ownedProjects, setOwnedProjects] = useState([])
  const [sharedProjects] = useState([])
  const [createSuffix, setCreateSuffix] = useState(() => createShortSuffix())

  const roomIdPreview = useMemo(
    () => `${createSlug(projectName) || "untitled-project"}-${createSuffix}`,
    [createSuffix, projectName]
  )

  const refreshProjects = useCallback(async () => {
    setOwnedProjects(await loadOwnedProjects(userId, getToken, { force: true }))
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

    try {
      const token = await getSessionToken(getToken)
      if (!token) {
        return
      }

      if (dialog.type === "create") {
        const createdProject = await createProject(token, projectName.trim() || null)
        const nextWorkspaceId = createRoomId(createdProject.id)
        const normalizedProject = normalizeProject(createdProject)
        setOwnedProjects((projects) => {
          const nextProjects = [normalizedProject, ...projects]
          setCachedOwnedProjects(userId, nextProjects)
          return nextProjects
        })
        closeDialog()
        navigate(`/editor/${nextWorkspaceId}`)
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
        setOwnedProjects((projects) =>
          projects.filter((project) => project.apiId !== deletedProject.apiId)
        )
        removeCachedOwnedProject(userId, deletedProject.apiId)
        closeDialog()

        if (
          activeWorkspaceId === deletedProject.roomId ||
          activeWorkspaceId === deletedProject.id
        ) {
          navigate("/editor")
          return
        }
        return
      }

      closeDialog()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
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
