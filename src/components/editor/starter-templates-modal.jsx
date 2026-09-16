import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArchitectureIcon } from "@/components/editor/architecture-icons"
import { CANVAS_TEMPLATES } from "@/components/editor/starter-templates"

const PREVIEW_WIDTH = 280
const PREVIEW_HEIGHT = 150
const PREVIEW_PADDING = 18

function getNodeSize(node) {
  return node.data.size ?? { width: 160, height: 96 }
}

function getPreviewLayout(nodes) {
  const bounds = nodes.reduce(
    (current, node) => {
      const size = getNodeSize(node)

      return {
        minX: Math.min(current.minX, node.position.x),
        minY: Math.min(current.minY, node.position.y),
        maxX: Math.max(current.maxX, node.position.x + size.width),
        maxY: Math.max(current.maxY, node.position.y + size.height),
      }
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  )

  const boundsWidth = Math.max(bounds.maxX - bounds.minX, 1)
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, 1)
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / boundsWidth,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / boundsHeight
  )
  const offsetX = (PREVIEW_WIDTH - boundsWidth * scale) / 2
  const offsetY = (PREVIEW_HEIGHT - boundsHeight * scale) / 2

  return {
    projectPoint(x, y) {
      return {
        x: offsetX + (x - bounds.minX) * scale,
        y: offsetY + (y - bounds.minY) * scale,
      }
    },
    scale,
  }
}

function getProjectedNode(node, layout) {
  const size = getNodeSize(node)
  const position = layout.projectPoint(node.position.x, node.position.y)

  return {
    ...position,
    width: size.width * layout.scale,
    height: size.height * layout.scale,
  }
}

function getNodeCenter(node, projectedNodes) {
  const projected = projectedNodes.get(node.id)

  return {
    x: projected.x + projected.width / 2,
    y: projected.y + projected.height / 2,
  }
}

function TemplatePreviewNode({ node, projected }) {
  const fill = node.data.color
  const stroke = "var(--border-subtle)"

  return (
    <foreignObject
      x={projected.x}
      y={projected.y}
      width={projected.width}
      height={projected.height}
    >
      <div
        className="flex h-full w-full items-center gap-1.5 rounded-md border px-1.5 text-[7px] font-semibold leading-none"
        style={{
          background: fill,
          borderColor: stroke,
          color: node.data.textColor,
        }}
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-surface-border bg-base/70 text-brand">
          <ArchitectureIcon iconKey={node.data.iconKey} className="h-3 w-3" />
        </div>
        <span className="min-w-0 flex-1 truncate">{node.data.label || "Label"}</span>
      </div>
    </foreignObject>
  )
}

function TemplatePreview({ template }) {
  const layout = getPreviewLayout(template.nodes)
  const projectedNodes = new Map(
    template.nodes.map((node) => [node.id, getProjectedNode(node, layout)])
  )
  const nodeMap = new Map(template.nodes.map((node) => [node.id, node]))

  return (
    <svg
      aria-hidden="true"
      className="h-36 w-full rounded-xl border border-surface-border bg-canvas"
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
    >
      {template.edges.map((edge) => {
        const source = nodeMap.get(edge.source)
        const target = nodeMap.get(edge.target)

        if (!source || !target) {
          return null
        }

        const start = getNodeCenter(source, projectedNodes)
        const end = getNodeCenter(target, projectedNodes)

        return (
          <line
            key={edge.id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="var(--text-faint)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        )
      })}
      {template.nodes.map((node) => (
        <TemplatePreviewNode
          key={node.id}
          node={node}
          projected={projectedNodes.get(node.id)}
        />
      ))}
    </svg>
  )
}

function StarterTemplatesModal({ open, onOpenChange, onImport }) {
  function handleImport(template) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,44rem)] gap-0 overflow-hidden border border-surface-border bg-surface p-0 text-copy-primary sm:max-w-4xl">
        <DialogHeader className="border-b border-surface-border px-5 py-4">
          <DialogTitle>Starter templates</DialogTitle>
          <DialogDescription>
            Replace the current canvas with a predefined architecture diagram.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(72vh,34rem)]">
          <div className="grid gap-3 p-5 md:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <article
                key={template.id}
                className="flex min-h-0 flex-col gap-3 rounded-xl border border-surface-border bg-base p-3 transition-colors hover:border-brand/70"
              >
                <TemplatePreview template={template} />
                <div className="min-h-24">
                  <h3 className="text-sm font-semibold text-copy-primary">
                    {template.name}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-copy-muted">
                    {template.description}
                  </p>
                </div>
                <Button
                  type="button"
                  className="mt-auto w-full"
                  onClick={() => handleImport(template)}
                >
                  Import
                </Button>
              </article>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export { StarterTemplatesModal }
