const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ""

function getProjectHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

async function parseProjectResponse(response) {
  if (!response.ok) {
    throw new Error(`Project API request failed with ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function fetchProjects(token) {
  const startedAt = performance.now()
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    cache: "no-store",
    headers: getProjectHeaders(token),
  })

  const projects = await parseProjectResponse(response)
  console.info("projects.fetch", {
    durationMs: Math.round(performance.now() - startedAt),
    status: response.status,
    count: projects.length,
  })

  return projects
}

async function createProject(token, name) {
  const startedAt = performance.now()
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: getProjectHeaders(token),
    body: JSON.stringify({ name }),
  })

  const project = await parseProjectResponse(response)
  console.info("projects.create", {
    durationMs: Math.round(performance.now() - startedAt),
    status: response.status,
    projectId: project.id,
  })

  return project
}

async function renameProject(token, projectId, name) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "PATCH",
    headers: getProjectHeaders(token),
    body: JSON.stringify({ name }),
  })

  return parseProjectResponse(response)
}

async function deleteProject(token, projectId) {
  const startedAt = performance.now()
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "DELETE",
    headers: getProjectHeaders(token),
  })

  const result = await parseProjectResponse(response)
  console.info("projects.delete", {
    durationMs: Math.round(performance.now() - startedAt),
    status: response.status,
    projectId,
  })

  return result
}

export { createProject, deleteProject, fetchProjects, renameProject }
