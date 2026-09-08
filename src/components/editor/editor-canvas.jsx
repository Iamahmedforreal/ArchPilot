import { useCallback, useRef } from "react"
import {
  Circle,
  Database,
  Diamond,
  Hexagon,
  Minus,
  Plus,
  RectangleHorizontal,
  Rows2,
} from "lucide-react"
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SHAPE_DRAG_TYPE = "application/archpilot-shape"
const DEFAULT_NODE_COLOR = "var(--bg-elevated)"

const shapes = [
  {
    name: "rectangle",
    label: "Rectangle",
    icon: RectangleHorizontal,
    size: { width: 180, height: 96 },
  },
  {
    name: "diamond",
    label: "Diamond",
    icon: Diamond,
    size: { width: 160, height: 160 },
  },
  {
    name: "circle",
    label: "Circle",
    icon: Circle,
    size: { width: 128, height: 128 },
  },
  {
    name: "pill",
    label: "Pill",
    icon: Rows2,
    size: { width: 180, height: 80 },
  },
  {
    name: "cylinder",
    label: "Cylinder",
    icon: Database,
    size: { width: 156, height: 116 },
  },
  {
    name: "hexagon",
    label: "Hexagon",
    icon: Hexagon,
    size: { width: 164, height: 116 },
  },
]

function CanvasNode({ data }) {
  const width = data.size?.width ?? 160
  const height = data.size?.height ?? 96

  return (
    <div
      className="flex items-center justify-center rounded-xl border border-surface-border px-4 text-center text-sm font-medium text-copy-primary shadow-xl"
      style={{
        width,
        height,
        background: data.color ?? DEFAULT_NODE_COLOR,
      }}
    >
      {data.label}
    </div>
  )
}

const nodeTypes = {
  canvasNode: CanvasNode,
}

function ShapePanel() {
  function handleDragStart(event, shape) {
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData(
      SHAPE_DRAG_TYPE,
      JSON.stringify({
        shape: shape.name,
        size: shape.size,
      })
    )
  }

  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
      {shapes.map((shape) => {
        const Icon = shape.icon

        return (
          <Button
            key={shape.name}
            type="button"
            variant="ghost"
            size="icon"
            draggable
            aria-label={`Add ${shape.label}`}
            title={shape.label}
            onDragStart={(event) => handleDragStart(event, shape)}
            className="rounded-full text-copy-muted hover:bg-subtle hover:text-brand"
          >
            <Icon className="h-5 w-5" />
          </Button>
        )
      })}
    </div>
  )
}

function ZoomControls({ onZoomIn, onZoomOut }) {
  return (
    <div className="absolute bottom-5 left-5 z-10 flex overflow-hidden rounded-xl border border-surface-border bg-copy-primary shadow-2xl">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={onZoomIn}
        className="rounded-none border-r border-base/20 bg-copy-primary text-base hover:bg-copy-secondary hover:text-base"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={onZoomOut}
        className="rounded-none bg-copy-primary text-base hover:bg-copy-secondary hover:text-base"
      >
        <Minus className="h-5 w-5" />
      </Button>
    </div>
  )
}

function CanvasSurface() {
  const nodeCounterRef = useRef(0)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const { screenToFlowPosition, zoomIn, zoomOut } = useReactFlow()

  const handleDragOver = useCallback((event) => {
    if (event.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    }
  }, [])

  const handleDrop = useCallback(
    (event) => {
      const payload = event.dataTransfer.getData(SHAPE_DRAG_TYPE)
      if (!payload) {
        return
      }

      event.preventDefault()

      let shapePayload
      try {
        shapePayload = JSON.parse(payload)
      } catch {
        return
      }

      if (!shapePayload.shape || !shapePayload.size) {
        return
      }

      nodeCounterRef.current += 1
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      setNodes((currentNodes) => [
        ...currentNodes,
        {
          id: `${shapePayload.shape}-${Date.now()}-${nodeCounterRef.current}`,
          type: "canvasNode",
          position,
          data: {
            label: "",
            color: DEFAULT_NODE_COLOR,
            shape: shapePayload.shape,
            size: shapePayload.size,
          },
        },
      ])
    },
    [screenToFlowPosition, setNodes]
  )

  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-canvas bg-dotted",
        "[&_.react-flow__attribution]:hidden"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        proOptions={{ hideAttribution: true }}
        minZoom={0.25}
        maxZoom={2.5}
        zoomOnPinch
        zoomOnScroll
        panOnDrag
        fitView
      />
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-copy-primary">
              Canvas workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-copy-muted">
              Drag a shape from the bottom panel to create a node.
            </p>
          </div>
        </div>
      )}
      <ZoomControls
        onZoomIn={() => zoomIn({ duration: 120 })}
        onZoomOut={() => zoomOut({ duration: 120 })}
      />
      <ShapePanel />
    </div>
  )
}

function EditorCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasSurface />
    </ReactFlowProvider>
  )
}

export { EditorCanvas }
