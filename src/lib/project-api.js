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
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    cache: "no-store",
    headers: getProjectHeaders(token),
  })

  return parseProjectResponse(response)
}

async function createProject(token, name) {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: getProjectHeaders(token),
    body: JSON.stringify({ name }),
  })

  return parseProjectResponse(response)
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
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "DELETE",
    headers: getProjectHeaders(token),
  })

  return parseProjectResponse(response)
}

export { createProject, deleteProject, fetchProjects, renameProject }
