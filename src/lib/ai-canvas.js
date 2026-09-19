import { architectureComponents } from "@/components/editor/architecture-components"

const componentIcons = new Map(
  architectureComponents.map(({ componentType, iconKey }) => [componentType, iconKey])
)
const edgeHandles = new Set(["top", "right", "bottom", "left"])

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function isUsableNode(node) {
  const expectedIcon = componentIcons.get(node?.data?.componentType)

  return (
    typeof node?.id === "string" &&
    node.id.length > 0 &&
    node.type === "canvasNode" &&
    isFiniteNumber(node.position?.x) &&
    isFiniteNumber(node.position?.y) &&
    typeof node.data?.label === "string" &&
    node.data.label.length > 0 &&
    expectedIcon === node.data.iconKey &&
    isFiniteNumber(node.data.size?.width) &&
    node.data.size.width >= 80 &&
    isFiniteNumber(node.data.size?.height) &&
    node.data.size.height >= 48
  )
}

function validateAiCanvasProposal(result) {
  if (!Array.isArray(result?.nodes) || !Array.isArray(result?.edges)) {
    throw new Error("The generated design did not contain a usable canvas.")
  }

  if (result.nodes.length === 0 || !result.nodes.every(isUsableNode)) {
    throw new Error("The generated design contained an unsupported component.")
  }

  const nodeIds = new Set(result.nodes.map((node) => node.id))
  if (nodeIds.size !== result.nodes.length) {
    throw new Error("The generated design contained duplicate component IDs.")
  }

  const edgeIds = new Set()
  for (const edge of result.edges) {
    const isUsableEdge =
      typeof edge?.id === "string" &&
      edge.id.length > 0 &&
      !edgeIds.has(edge.id) &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target) &&
      edge.type === "smoothstep" &&
      edgeHandles.has(edge.sourceHandle) &&
      edgeHandles.has(edge.targetHandle)

    if (!isUsableEdge) {
      throw new Error("The generated design contained an unusable connection.")
    }

    edgeIds.add(edge.id)
  }

  return { nodes: result.nodes, edges: result.edges }
}

export { validateAiCanvasProposal }
