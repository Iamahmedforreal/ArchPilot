import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/react"

import {
  createProject,
  deleteProject,
  fetchProjects,
  renameProject,
} from "@/lib/project-api"

function createRoomId(projectId) {
  return String(projectId)
}

const ownedProjectsCache = new Map()
const ownedProjectsRequests = new Map()
const ownedProjectsGenerations = new Map()

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

function getOwnedProjectsGeneration(userId) {
  return ownedProjectsGenerations.get(userId) ?? 0
}

function nextOwnedProjectsGeneration(userId) {
  const generation = getOwnedProjectsGeneration(userId) + 1
  ownedProjectsGenerations.set(userId, generation)

  return generation
}

function isCurrentOwnedProjectsGeneration(userId, generation) {
  return getOwnedProjectsGeneration(userId) === generation
}

function setCachedOwnedProjects(userId, projects, generation) {
  if (!isCurrentOwnedProjectsGeneration(userId, generation)) {
    return
  }

  ownedProjectsCache.set(userId, projects)
}

function removeCachedOwnedProject(userId, projectId, generation) {
  if (!isCurrentOwnedProjectsGeneration(userId, generation)) {
    return
  }

  if (!ownedProjectsCache.has(userId)) {
    return
  }

  setCachedOwnedProjects(
    userId,
    ownedProjectsCache
      .get(userId)
      .filter((project) => project.apiId !== projectId),
    generation
  )
}

async function loadOwnedProjects(userId, getToken, { force = false } = {}) {
  if (!userId || !getToken) {
    return { generation: 0, projects: [] }
  }

  if (!force && ownedProjectsCache.has(userId)) {
    return {
      generation: getOwnedProjectsGeneration(userId),
      projects: ownedProjectsCache.get(userId),
    }
  }

  if (!force && ownedProjectsRequests.has(userId)) {
    return ownedProjectsRequests.get(userId)
  }

  const generation = nextOwnedProjectsGeneration(userId)
  const request = loadOwnedProjectsFromApi(userId, getToken).then((projects) => ({
    generation,
    projects,
  }))
  ownedProjectsRequests.set(userId, request)

  try {
    const result = await request
    setCachedOwnedProjects(userId, result.projects, result.generation)
    return result
  } finally {
    if (ownedProjectsRequests.get(userId) === request) {
      ownedProjectsRequests.delete(userId)
    }
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
  const ownedProjectsRef = useRef(ownedProjects)

  useEffect(() => {
    ownedProjectsRef.current = ownedProjects
  }, [ownedProjects])

  const refreshProjects = useCallback(async () => {
    const result = await loadOwnedProjects(userId, getToken, { force: true })

    if (userId && isCurrentOwnedProjectsGeneration(userId, result.generation)) {
      setOwnedProjects(result.projects)
    }
  }, [getToken, userId])

  useEffect(() => {
    let ignore = false

    loadOwnedProjects(userId, getToken).then((result) => {
      if (!ignore) {
        if (userId && isCurrentOwnedProjectsGeneration(userId, result.generation)) {
          setOwnedProjects(result.projects)
        }
      }
    })

    return () => {
      ignore = true
    }
  }, [getToken, userId])

  function openCreateDialog() {
    setProjectName("")
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
        const generation = nextOwnedProjectsGeneration(userId)
        const createdProject = await createProject(token, projectName.trim() || null)
        if (!isCurrentOwnedProjectsGeneration(userId, generation)) {
          return
        }

        const nextWorkspaceId = createRoomId(createdProject.id)
        const normalizedProject = normalizeProject(createdProject)
        const nextProjects = [normalizedProject, ...ownedProjectsRef.current]
        setCachedOwnedProjects(userId, nextProjects, generation)
        setOwnedProjects(nextProjects)
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
        const generation = nextOwnedProjectsGeneration(userId)
        const deletedProject = dialog.project
        await deleteProject(token, deletedProject.apiId)
        if (!isCurrentOwnedProjectsGeneration(userId, generation)) {
          return
        }

        const nextProjects = ownedProjectsRef.current.filter(
          (project) => project.apiId !== deletedProject.apiId
        )
        setOwnedProjects(nextProjects)
        removeCachedOwnedProject(userId, deletedProject.apiId, generation)
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
