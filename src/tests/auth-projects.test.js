import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  isPublicAuthRoute,
  isSignInRoute,
  isSignUpRoute,
  normalizePath,
} from "@/lib/auth-routes"
import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
  renameProject,
} from "@/lib/project-api"

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe("authentication and projects", () => {
  const fetchMock = vi.fn()

  beforeEach(() => vi.stubGlobal("fetch", fetchMock))
  afterEach(() => vi.unstubAllGlobals())

  it("recognizes protected auth routes with or without a trailing slash", () => {
    expect(normalizePath("/sign-in/")).toBe("/sign-in")
    expect(isPublicAuthRoute("/sign-in/extra")).toBe(true)
    expect(isSignInRoute("/sign-in/")).toBe(true)
    expect(isSignUpRoute("/sign-up/")).toBe(true)
    expect(isPublicAuthRoute("/editor")).toBe(false)
  })

  it("supports the owned project list and mutation requests", async () => {
    fetchMock
      .mockResolvedValueOnce(response([{ id: 1, name: "Workspace" }]))
      .mockResolvedValueOnce(response({ id: 2, name: "New workspace" }, 201))
      .mockResolvedValueOnce(response({ id: 2, name: "Renamed workspace" }))
      .mockResolvedValueOnce(response(null, 204))
      .mockResolvedValueOnce(response(null, 404))

    await expect(fetchProjects("token")).resolves.toEqual([
      { id: 1, name: "Workspace" },
    ])
    await expect(createProject("token", "New workspace")).resolves.toEqual({
      id: 2,
      name: "New workspace",
    })
    await expect(renameProject("token", 2, "Renamed workspace")).resolves.toEqual({
      id: 2,
      name: "Renamed workspace",
    })
    await expect(deleteProject("token", 2)).resolves.toBeNull()
    await expect(
      fetchProject("token", 404)
    ).resolves.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls[1][1].body).toBe(
      JSON.stringify({ name: "New workspace" })
    )
  })
})
