import { describe, expect, it } from "vitest"

import { CANVAS_TEMPLATES } from "@/components/editor/starter-templates"

describe("starter system designs", () => {
  it("provides static templates with connected canvas graphs", () => {
    expect(CANVAS_TEMPLATES.length).toBeGreaterThan(0)

    for (const template of CANVAS_TEMPLATES) {
      const nodeIds = new Set(template.nodes.map((node) => node.id))
      const edgeIds = new Set(template.edges.map((edge) => edge.id))

      expect(template.name).toEqual(expect.any(String))
      expect(template.nodes.length).toBeGreaterThan(0)
      expect(template.edges.length).toBeGreaterThan(0)
      expect(edgeIds.size).toBe(template.edges.length)

      for (const node of template.nodes) {
        expect(node.type).toBe("canvasNode")
        expect(node.data.componentType).toEqual(expect.any(String))
      }

      for (const edge of template.edges) {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
        expect(edge.type).toBe("smoothstep")
        expect(edge.markerEnd.type).toBe("arrowclosed")
      }
    }
  })
})
