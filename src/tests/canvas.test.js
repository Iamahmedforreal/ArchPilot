import { describe, expect, it, vi } from "vitest"

import { fetchCanvas, saveCanvas } from "@/lib/project-api"

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe("canvas snapshots", () => {
  it("loads an empty canvas as null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, 204))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchCanvas("token", 7)).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/7/canvas",
      expect.objectContaining({ cache: "no-store" })
    )

    vi.unstubAllGlobals()
  })

  it("saves nodes and edges with the current revision", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ revision: "rev-2" }))
    vi.stubGlobal("fetch", fetchMock)
    const canvas = {
      nodes: [{ id: "api-1" }],
      edges: [{ id: "api-db" }],
    }

    await expect(saveCanvas("token", 7, canvas, "rev-1")).resolves.toEqual({
      revision: "rev-2",
    })

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ ...canvas, revision: "rev-1" }),
    })
    vi.unstubAllGlobals()
  })
})
