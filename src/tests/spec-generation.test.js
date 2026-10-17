import { describe, expect, it, vi } from "vitest"

import {
  downloadProjectFile,
  fetchAiMessages,
  fetchAiRun,
  submitAiDesign,
  submitAiSpec,
} from "@/lib/project-api"

function response(body) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe("spec generation", () => {
  it("submits the confirmed canvas revision with an AI design request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ run_id: "run-2" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      submitAiDesign("token", 7, "Add Redis", {
        expectedCanvasRevision: "rev-5",
      })
    ).resolves.toEqual({ run_id: "run-2" })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/7/ai/design",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Add Redis",
          expected_canvas_revision: "rev-5",
          clarification_answers: null,
        }),
      })
    )
    vi.unstubAllGlobals()
  })

  it("submits the original instruction and clarification answers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ run_id: "run-3" }))
    vi.stubGlobal("fetch", fetchMock)

    await submitAiDesign("token", 7, "Make it scalable", {
      expectedCanvasRevision: "rev-5",
      clarificationAnswers: [
        {
          question: "What scale are you targeting?",
          answer: "Thousands of concurrent users",
        },
      ],
    })

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({
        message: "Make it scalable",
        expected_canvas_revision: "rev-5",
        clarification_answers: [
          {
            question: "What scale are you targeting?",
            answer: "Thousands of concurrent users",
          },
        ],
      })
    )
    vi.unstubAllGlobals()
  })

  it("submits the saved canvas revision and instruction", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ run_id: "run-1" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      submitAiSpec("token", 7, "rev-4", "Focus on storage")
    ).resolves.toEqual({ run_id: "run-1" })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/7/ai/spec",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          expected_canvas_revision: "rev-4",
          instruction: "Focus on storage",
        }),
      })
    )
    vi.unstubAllGlobals()
  })

  it("polls the generated spec run through the project API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({ run_id: "run-1", status: "SUCCEEDED", result: { file_id: "file-1" } })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchAiRun("token", 7, "run-1")).resolves.toMatchObject({
      status: "SUCCEEDED",
    })
    vi.unstubAllGlobals()
  })

  it("loads the saved project conversation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response([
        {
          id: "message-1",
          role: "USER",
          message: "Focus on the API",
          created_at: "2026-10-08T10:00:00Z",
        },
      ])
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchAiMessages("token", 7)).resolves.toEqual([
      expect.objectContaining({ role: "USER" }),
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/7/ai/messages",
      expect.objectContaining({ cache: "no-store" })
    )
    vi.unstubAllGlobals()
  })

  it("downloads the generated Markdown file", async () => {
    const link = {
      click: vi.fn(),
      remove: vi.fn(),
    }
    const blob = { type: "text/markdown" }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(blob),
    })
    const createObjectURL = vi.fn().mockReturnValue("blob:spec")
    const revokeObjectURL = vi.fn()

    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("window", {
      URL: { createObjectURL, revokeObjectURL },
    })
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(link),
      body: { append: vi.fn() },
    })

    await downloadProjectFile("token", 7, "file-1", "architecture.md")

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(link.href).toBe("blob:spec")
    expect(link.download).toBe("architecture.md")
    expect(link.click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:spec")
    vi.unstubAllGlobals()
  })
})
