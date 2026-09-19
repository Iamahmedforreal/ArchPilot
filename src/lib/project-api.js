const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ""

function getProjectHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

async function parseProjectResponse(response) {
  if (!response.ok) {
    let payload = null

    try {
      payload = await response.json()
    } catch {
      // Some infrastructure errors do not include a JSON response body.
    }

    const detail = typeof payload?.detail === "string" ? payload.detail : null
    const error = new Error(
      detail || `Project API request failed with ${response.status}`
    )
    error.status = response.status
    error.detail = detail
    throw error
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function fetchProjects(token, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    cache: "no-store",
    headers: getProjectHeaders(token),
    signal: options.signal,
  })

  return parseProjectResponse(response)
}

async function fetchProject(token, projectId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    cache: "no-store",
    headers: getProjectHeaders(token),
    signal: options.signal,
  })

  if (response.status === 404 || response.status === 403) {
    return null
  }

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

async function fetchCanvas(token, projectId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/canvas`, {
    cache: "no-store",
    headers: getProjectHeaders(token),
    signal: options.signal,
  })

  if (response.status === 204) {
    return null
  }

  return parseProjectResponse(response)
}

async function saveCanvas(token, projectId, canvas, revision) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/canvas`, {
    method: "PUT",
    headers: getProjectHeaders(token),
    body: JSON.stringify({ ...canvas, revision }),
  })

  return parseProjectResponse(response)
}

async function submitAiDesign(token, projectId, message, options = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/ai/design`,
    {
      method: "POST",
      headers: getProjectHeaders(token),
      body: JSON.stringify({ message }),
      signal: options.signal,
    }
  )

  return parseProjectResponse(response)
}

async function fetchAiRun(token, projectId, runId, options = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/ai/runs/${runId}`,
    {
      cache: "no-store",
      headers: getProjectHeaders(token),
      signal: options.signal,
    }
  )

  return parseProjectResponse(response)
}

export {
  createProject,
  deleteProject,
  fetchAiRun,
  fetchCanvas,
  fetchProject,
  fetchProjects,
  renameProject,
  saveCanvas,
  submitAiDesign,
}
