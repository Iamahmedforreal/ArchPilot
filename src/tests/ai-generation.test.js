import { describe, expect, it } from "vitest"

import { architectureComponents } from "@/components/editor/architecture-components"
import { validateAiCanvasProposal } from "@/lib/ai-canvas"

const component = architectureComponents.find(({ componentType }) => componentType === "api")

function validProposal() {
  return {
    nodes: [
      {
        id: "api-1",
        type: "canvasNode",
        position: { x: 0, y: 0 },
        data: {
          label: "API",
          componentType: component.componentType,
          iconKey: component.iconKey,
          size: { width: 160, height: 88 },
        },
      },
      {
        id: "database-1",
        type: "canvasNode",
        position: { x: 240, y: 0 },
        data: {
          label: "Database",
          componentType: "database",
          iconKey: "database",
          size: { width: 160, height: 88 },
        },
      },
    ],
    edges: [
      {
        id: "api-database",
        source: "api-1",
        target: "database-1",
        sourceHandle: "right",
        targetHandle: "left",
        type: "smoothstep",
      },
    ],
  }
}

describe("AI architecture generation", () => {
  it("accepts a renderable generated graph", () => {
    expect(validateAiCanvasProposal(validProposal()).edges).toHaveLength(1)
  })

  it("rejects a graph with an unknown edge endpoint", () => {
    expect(() =>
      validateAiCanvasProposal({
        ...validProposal(),
        edges: [{ ...validProposal().edges[0], target: "missing" }],
      })
    ).toThrow("unusable connection")
  })
})
