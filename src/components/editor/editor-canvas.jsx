import { useCallback, useEffect, useRef, useState } from "react"
import { MoreHorizontal, Minus, Plus } from "lucide-react"
import {
  addEdge,
  ConnectionMode,
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react"

import { Button } from "@/components/ui/button"
import { architectureComponents } from "@/components/editor/architecture-components"
import { ArchitectureIcon } from "@/components/editor/architecture-icons"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave"
import { cn } from "@/lib/utils"

const SHAPE_DRAG_TYPE = "application/archpilot-shape"
const DEFAULT_NODE_COLOR = "var(--bg-elevated)"
const DEFAULT_NODE_TEXT_COLOR = "var(--text-primary)"
const HISTORY_LIMIT = 80
const PRIMARY_COMPONENT_TYPES = [
  "webApp",
  "api",
  "service",
  "database",
  "queue",
]

const nodeColorPalette = [
  {
    name: "Neutral",
    background: "var(--bg-subtle)",
    text: "var(--text-primary)",
  },
  {
    name: "Brand",
    background: "#3a1a14",
    text: "var(--accent-primary-hover)",
  },
  {
    name: "AI",
    background: "#2a2140",
    text: "#b7a9ff",
  },
  {
    name: "Warning",
    background: "#332510",
    text: "var(--state-warning)",
  },
  {
    name: "Success",
    background: "#173524",
    text: "var(--state-success)",
  },
  {
    name: "External",
    background: "#242424",
    text: "var(--text-primary)",
  },
]

function cloneCanvasSnapshot(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: {
        ...node.data,
        size: node.data.size ? { ...node.data.size } : undefined,
      },
    })),
    edges: edges.map((edge) => ({
      ...edge,
      style: edge.style ? { ...edge.style } : undefined,
      markerEnd: edge.markerEnd ? { ...edge.markerEnd } : undefined,
    })),
  }
}

function areCanvasSnapshotsEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second)
}

function isTextEditingTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  )
}

function ShapeRenderer({
  shape,
  label = "",
  size,
  color = DEFAULT_NODE_COLOR,
  textColor = DEFAULT_NODE_TEXT_COLOR,
  selected = false,
  preview = false,
}) {
  const width = size?.width ?? 160
  const height = size?.height ?? 96
  const strokeColor = selected
    ? "var(--accent-primary-hover)"
    : "var(--border-subtle)"
  const shapeClassName = cn(
    "relative flex items-center justify-center px-4 text-center text-sm font-medium",
    preview && "opacity-70"
  )

  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        className={cn(
          shapeClassName,
          "border shadow-xl",
          shape === "rectangle" && "rounded-xl",
          shape === "pill" && "rounded-full",
          shape === "circle" && "rounded-full"
        )}
        style={{
          width,
          height,
          background: color,
          borderColor: strokeColor,
          color: textColor,
        }}
      >
        {label}
      </div>
    )
  }

  if (shape === "diamond") {
    return (
      <div className={shapeClassName} style={{ width, height }}>
        <svg
          className="absolute inset-0 h-full w-full overflow-visible drop-shadow-xl"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <polygon
            points={`${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}`}
            fill={color}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
        <span className="relative z-10 max-w-[62%]" style={{ color: textColor }}>
          {label}
        </span>
      </div>
    )
  }

  if (shape === "hexagon") {
    return (
      <div className={shapeClassName} style={{ width, height }}>
        <svg
          className="absolute inset-0 h-full w-full overflow-visible drop-shadow-xl"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <polygon
            points={`${width * 0.25},1 ${width * 0.75},1 ${width - 1},${height / 2} ${width * 0.75},${height - 1} ${width * 0.25},${height - 1} 1,${height / 2}`}
            fill={color}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
        <span className="relative z-10 max-w-[70%]" style={{ color: textColor }}>
          {label}
        </span>
      </div>
    )
  }

  if (shape === "cylinder") {
    const ellipseHeight = Math.max(18, height * 0.18)

    return (
      <div className={shapeClassName} style={{ width, height }}>
        <svg
          className="absolute inset-0 h-full w-full overflow-visible drop-shadow-xl"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <path
            d={`M 1 ${ellipseHeight / 2} C 1 ${ellipseHeight * 1.45} ${width - 1} ${ellipseHeight * 1.45} ${width - 1} ${ellipseHeight / 2} V ${height - ellipseHeight / 2} C ${width - 1} ${height + ellipseHeight * 0.45} 1 ${height + ellipseHeight * 0.45} 1 ${height - ellipseHeight / 2} Z`}
            fill={color}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <ellipse
            cx={width / 2}
            cy={ellipseHeight / 2}
            rx={(width - 2) / 2}
            ry={ellipseHeight / 2}
            fill={color}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <path
            d={`M 1 ${height - ellipseHeight / 2} C 1 ${height + ellipseHeight * 0.45} ${width - 1} ${height + ellipseHeight * 0.45} ${width - 1} ${height - ellipseHeight / 2}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
        <span className="relative z-10 max-w-[72%]" style={{ color: textColor }}>
          {label}
        </span>
      </div>
    )
  }

  return null
}

const MIN_NODE_SIZE = {
  width: 80,
  height: 48,
}

function resolveNodeColor(color) {
  return color && color !== "default" ? color : DEFAULT_NODE_COLOR
}

function ArchitectureNodeRenderer({
  iconKey,
  label = "",
  size,
  color = DEFAULT_NODE_COLOR,
  textColor = DEFAULT_NODE_TEXT_COLOR,
  selected = false,
  preview = false,
  hideLabel = false,
}) {
  const width = size?.width ?? 160
  const height = size?.height ?? 88
  const resolvedColor = resolveNodeColor(color)

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 text-sm font-semibold shadow-xl",
        preview && "opacity-70"
      )}
      style={{
        width,
        height,
        background: resolvedColor,
        borderColor: selected
          ? "var(--accent-primary-hover)"
          : "var(--border-subtle)",
        color: textColor,
      }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-surface-border bg-base/70 text-brand">
        <ArchitectureIcon iconKey={iconKey} className="h-5 w-5" />
      </div>
      {hideLabel ? (
        <span className="min-w-0 flex-1" />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !label && "text-copy-faint"
          )}
        >
          {label || "Label"}
        </span>
      )}
    </div>
  )
}

function NodeColorToolbar({ activeColor, activeTextColor, onSelectColor }) {
  function stopToolbarInteraction(event) {
    event.stopPropagation()
  }

  return (
    <div
      className="nodrag nopan absolute bottom-full left-1/2 z-30 mb-3 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl"
      onPointerDown={stopToolbarInteraction}
      onMouseDown={stopToolbarInteraction}
      onDoubleClick={stopToolbarInteraction}
    >
      {nodeColorPalette.map((option) => {
        const isActive =
          activeColor === option.background && activeTextColor === option.text

        return (
          <button
            key={option.name}
            type="button"
            aria-label={`Use ${option.name} node color`}
            title={option.name}
            onClick={(event) => {
              stopToolbarInteraction(event)
              onSelectColor(option)
            }}
            className={cn(
              "h-6 w-6 rounded-full border transition-all",
              isActive
                ? "scale-110 border-copy-primary"
                : "border-surface-border hover:border-copy-primary"
            )}
            style={{
              background: option.background,
              boxShadow: isActive
                ? `0 0 0 2px ${option.text}`
                : `0 0 0 0 ${option.text}`,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.boxShadow = `0 0 0 2px ${option.text}`
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.boxShadow = isActive
                ? `0 0 0 2px ${option.text}`
                : `0 0 0 0 ${option.text}`
            }}
          />
        )
      })}
    </div>
  )
}

function CanvasNode({ id, data, selected }) {
  const [isEditing, setIsEditing] = useState(false)
  const { updateNodeData } = useReactFlow()
  const width = data.size?.width ?? 160
  const height = data.size?.height ?? (data.shape ? 96 : 88)
  const label = data.label ?? ""
  const nodeColor = data.color ?? DEFAULT_NODE_COLOR
  const nodeTextColor = data.textColor ?? DEFAULT_NODE_TEXT_COLOR
  const isLegacyShapeNode = Boolean(data.shape)

  const updateLabel = useCallback(
    (value) => {
      updateNodeData(id, { label: value })
    },
    [id, updateNodeData]
  )

  const updateSize = useCallback(
    (size) => {
      updateNodeData(id, {
        size: {
          width: size.width,
          height: size.height,
        },
      })
    },
    [id, updateNodeData]
  )

  const updateColor = useCallback(
    (colorPair) => {
      updateNodeData(id, {
        color: colorPair.background,
        textColor: colorPair.text,
      })
    },
    [id, updateNodeData]
  )

  function stopCanvasInteraction(event) {
    event.stopPropagation()
  }

  return (
    <div className="group relative">
      {selected && (
        <NodeColorToolbar
          activeColor={nodeColor}
          activeTextColor={nodeTextColor}
          onSelectColor={updateColor}
        />
      )}
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_SIZE.width}
        minHeight={MIN_NODE_SIZE.height}
        onResize={(_, size) => updateSize(size)}
        handleClassName="!h-4 !w-4 !rounded-full !border-2 !border-canvas !bg-copy-primary !shadow-lg transition-colors hover:!bg-brand"
        lineClassName="!border-brand !opacity-80"
      />
      {isLegacyShapeNode ? (
        <ShapeRenderer
          shape={data.shape}
          label=""
          size={{ width, height }}
          color={resolveNodeColor(nodeColor)}
          textColor={nodeTextColor}
          selected={selected}
        />
      ) : (
        <ArchitectureNodeRenderer
          iconKey={data.iconKey}
          label=""
          size={{ width, height }}
          color={nodeColor}
          textColor={nodeTextColor}
          selected={selected}
          hideLabel
        />
      )}
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center text-center",
          isLegacyShapeNode
            ? "justify-center px-4"
            : "justify-start px-3 pl-[3.75rem] pr-4 text-left"
        )}
      >
        {isEditing ? (
          <textarea
            value={label}
            placeholder="Label"
            autoFocus
            onChange={(event) => updateLabel(event.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                setIsEditing(false)
              }
            }}
            onPointerDown={stopCanvasInteraction}
            onMouseDown={stopCanvasInteraction}
            onDoubleClick={stopCanvasInteraction}
            className={cn(
              "nodrag nopan max-h-full min-h-5 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm font-medium leading-5 outline-none placeholder:text-copy-faint",
              isLegacyShapeNode ? "text-center" : "text-left"
            )}
            style={{ color: label ? nodeTextColor : "var(--text-faint)" }}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onDoubleClick={(event) => {
              stopCanvasInteraction(event)
              setIsEditing(true)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                setIsEditing(true)
              }
            }}
            className={cn(
              "flex h-full w-full items-center whitespace-pre-wrap break-words text-sm font-medium leading-5 outline-none",
              isLegacyShapeNode ? "justify-center text-center" : "justify-start text-left",
              !label && "text-copy-faint"
            )}
            style={{ color: label ? nodeTextColor : undefined }}
          >
            {label || "Label"}
          </div>
        )}
      </div>
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-canvas !bg-copy-primary !opacity-100 !shadow-lg hover:!bg-brand"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-canvas !bg-copy-primary !opacity-100 !shadow-lg hover:!bg-brand"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-canvas !bg-copy-primary !opacity-100 !shadow-lg hover:!bg-brand"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-canvas !bg-copy-primary !opacity-100 !shadow-lg hover:!bg-brand"
      />
    </div>
  )
}

const nodeTypes = {
  canvasNode: CanvasNode,
}

function ComponentPalette({ onPreviewStart, onPreviewMove, onPreviewEnd }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const primaryComponents = PRIMARY_COMPONENT_TYPES.map((componentType) =>
    architectureComponents.find((component) => component.componentType === componentType)
  ).filter(Boolean)
  const overflowComponents = architectureComponents.filter(
    (component) => !PRIMARY_COMPONENT_TYPES.includes(component.componentType)
  )

  function handleDragStart(event, component) {
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData(
      SHAPE_DRAG_TYPE,
      JSON.stringify({
        componentType: component.componentType,
        iconKey: component.iconKey,
        defaultLabel: component.label,
        width: component.width,
        height: component.height,
      })
    )
    onPreviewStart(component, event)
    setIsMoreOpen(false)

    if (typeof Image !== "undefined") {
      const dragImage = new Image()
      dragImage.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
      event.dataTransfer.setDragImage(dragImage, 0, 0)
    }
  }

  function renderComponentButton(component, compact = false) {
    return (
      <Button
        key={component.componentType}
        type="button"
        variant="ghost"
        draggable
        aria-label={`Add ${component.label}`}
        title={`${component.group}: ${component.label}`}
        onDragStart={(event) => handleDragStart(event, component)}
        onDrag={(event) => onPreviewMove(event)}
        onDragEnd={onPreviewEnd}
        className={cn(
          "shrink-0 text-copy-muted hover:bg-subtle hover:text-brand",
          compact
            ? "h-9 w-full justify-start gap-2 rounded-md px-2"
            : "h-9 w-[5.5rem] flex-col gap-0.5 rounded-full px-2"
        )}
      >
        <ArchitectureIcon iconKey={component.iconKey} className="h-4 w-4" />
        <span
          className={cn(
            "truncate font-medium leading-none",
            compact ? "text-xs" : "max-w-full text-[10px]"
          )}
        >
          {component.label}
        </span>
      </Button>
    )
  }

  return (
    <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
      {isMoreOpen && (
        <div className="absolute bottom-full right-0 mb-2 grid w-72 grid-cols-2 gap-1 rounded-xl border border-surface-border bg-surface/95 p-2 shadow-2xl backdrop-blur-xl">
          {overflowComponents.map((component) =>
            renderComponentButton(component, true)
          )}
        </div>
      )}
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
        {primaryComponents.map((component) => renderComponentButton(component))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={isMoreOpen}
          aria-label="Show more architecture components"
          title="More components"
          onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
          className="h-9 w-9 rounded-full text-copy-muted hover:bg-subtle hover:text-brand"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

function DragPreview({ preview }) {
  if (!preview) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: preview.x,
        top: preview.y,
        transform: "translate(14px, 14px) scale(0.72)",
        transformOrigin: "top left",
      }}
    >
      {preview.shape ? (
        <ShapeRenderer
          shape={preview.shape}
          size={preview.size}
          color={DEFAULT_NODE_COLOR}
          preview
        />
      ) : (
        <ArchitectureNodeRenderer
          iconKey={preview.iconKey}
          label={preview.label}
          size={preview.size}
          color="default"
          preview
        />
      )}
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

function CanvasSurface({
  isTemplatesModalOpen,
  onTemplatesModalOpenChange,
  projectId,
  getToken,
  onSaveStatusChange,
}) {
  const nodeCounterRef = useRef(0)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [dragPreview, setDragPreview] = useState(null)
  const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow()
  const historyRef = useRef({ past: [], future: [] })
  const lastSnapshotRef = useRef(null)
  const isApplyingHistoryRef = useRef(false)

  useCanvasAutosave({
    projectId,
    nodes,
    edges,
    setNodes,
    setEdges,
    getToken,
    onStatusChange: onSaveStatusChange,
  })

  useEffect(() => {
    const snapshot = cloneCanvasSnapshot(nodes, edges)

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false
      lastSnapshotRef.current = snapshot
      return
    }

    if (!lastSnapshotRef.current) {
      lastSnapshotRef.current = snapshot
      return
    }

    if (areCanvasSnapshotsEqual(lastSnapshotRef.current, snapshot)) {
      return
    }

    historyRef.current.past = [
      ...historyRef.current.past,
      lastSnapshotRef.current,
    ].slice(-HISTORY_LIMIT)
    historyRef.current.future = []
    lastSnapshotRef.current = snapshot
  }, [edges, nodes])

  const handleConnect = useCallback(
    (connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: false,
            style: { stroke: "var(--text-faint)", strokeWidth: 1.5 },
            markerEnd: { type: "arrowclosed", color: "var(--text-faint)" },
          },
          currentEdges
        )
      )
    },
    [setEdges]
  )

  const applyCanvasSnapshot = useCallback(
    (snapshot) => {
      isApplyingHistoryRef.current = true
      lastSnapshotRef.current = snapshot
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)
    },
    [setEdges, setNodes]
  )

  const undoCanvasChange = useCallback(() => {
    const previousSnapshot = historyRef.current.past.at(-1)
    if (!previousSnapshot || !lastSnapshotRef.current) {
      return
    }

    historyRef.current.past = historyRef.current.past.slice(0, -1)
    historyRef.current.future = [
      cloneCanvasSnapshot(nodes, edges),
      ...historyRef.current.future,
    ].slice(0, HISTORY_LIMIT)
    applyCanvasSnapshot(previousSnapshot)
  }, [applyCanvasSnapshot, edges, nodes])

  const redoCanvasChange = useCallback(() => {
    const nextSnapshot = historyRef.current.future[0]
    if (!nextSnapshot) {
      return
    }

    historyRef.current.future = historyRef.current.future.slice(1)
    historyRef.current.past = [
      ...historyRef.current.past,
      cloneCanvasSnapshot(nodes, edges),
    ].slice(-HISTORY_LIMIT)
    applyCanvasSnapshot(nextSnapshot)
  }, [applyCanvasSnapshot, edges, nodes])

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTextEditingTarget(event.target)) {
        return
      }

      const isUndoRedoShortcut = event.metaKey || event.ctrlKey

      if (!isUndoRedoShortcut && (event.key === "+" || event.key === "=")) {
        event.preventDefault()
        zoomIn({ duration: 120 })
        return
      }

      if (!isUndoRedoShortcut && event.key === "-") {
        event.preventDefault()
        zoomOut({ duration: 120 })
        return
      }

      if (isUndoRedoShortcut && event.key.toLowerCase() === "z") {
        event.preventDefault()

        if (event.shiftKey) {
          redoCanvasChange()
          return
        }

        undoCanvasChange()
        return
      }

      if (isUndoRedoShortcut && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redoCanvasChange()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [redoCanvasChange, undoCanvasChange, zoomIn, zoomOut])

  const handlePreviewStart = useCallback((component, event) => {
    setDragPreview({
      componentType: component.componentType,
      iconKey: component.iconKey,
      label: component.label,
      size: {
        width: component.width,
        height: component.height,
      },
      x: event.clientX,
      y: event.clientY,
    })
  }, [])

  const handlePreviewMove = useCallback((event) => {
    if (event.clientX === 0 && event.clientY === 0) {
      return
    }

    setDragPreview((preview) =>
      preview
        ? {
            ...preview,
            x: event.clientX,
            y: event.clientY,
          }
        : null
    )
  }, [])

  const handlePreviewEnd = useCallback(() => {
    setDragPreview(null)
  }, [])

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
        setDragPreview(null)
        return
      }

      event.preventDefault()
      setDragPreview(null)

      let componentPayload
      try {
        componentPayload = JSON.parse(payload)
      } catch {
        return
      }

      const isArchitectureComponent =
        componentPayload.componentType &&
        componentPayload.iconKey &&
        componentPayload.width &&
        componentPayload.height
      const isLegacyShape = componentPayload.shape && componentPayload.size

      if (!isArchitectureComponent && !isLegacyShape) {
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
          id: `${componentPayload.componentType ?? componentPayload.shape}-${Date.now()}-${nodeCounterRef.current}`,
          type: "canvasNode",
          position,
          data: isArchitectureComponent
            ? {
                label: componentPayload.defaultLabel,
                color: "default",
                textColor: DEFAULT_NODE_TEXT_COLOR,
                componentType: componentPayload.componentType,
                iconKey: componentPayload.iconKey,
                size: {
                  width: componentPayload.width,
                  height: componentPayload.height,
                },
              }
            : {
                label: "",
                color: DEFAULT_NODE_COLOR,
                textColor: DEFAULT_NODE_TEXT_COLOR,
                shape: componentPayload.shape,
                size: componentPayload.size,
              },
        },
      ])
    },
    [screenToFlowPosition, setNodes]
  )

  const handleImportTemplate = useCallback(
    (template) => {
      const templateNodes = template.nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        data: {
          ...node.data,
          size: node.data.size ? { ...node.data.size } : undefined,
        },
      }))
      const templateEdges = template.edges.map((edge) => ({
        ...edge,
        style: edge.style ? { ...edge.style } : undefined,
        markerEnd: edge.markerEnd ? { ...edge.markerEnd } : undefined,
      }))

      setNodes(templateNodes)
      setEdges(templateEdges)

      window.requestAnimationFrame(() => {
        fitView({ padding: 0.24, duration: 180 })
      })
    },
    [fitView, setEdges, setNodes]
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
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={{ stroke: "var(--accent-primary)", strokeWidth: 1.5 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.25}
        maxZoom={2.5}
        zoomOnPinch
        zoomOnScroll
        panOnDrag
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      />
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-copy-primary">
              Canvas workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-copy-muted">
              Drag a component from the bottom panel to create a node.
            </p>
          </div>
        </div>
      )}
      <ZoomControls
        onZoomIn={() => zoomIn({ duration: 120 })}
        onZoomOut={() => zoomOut({ duration: 120 })}
      />
      <ComponentPalette
        onPreviewStart={handlePreviewStart}
        onPreviewMove={handlePreviewMove}
        onPreviewEnd={handlePreviewEnd}
      />
      <DragPreview preview={dragPreview} />
      <StarterTemplatesModal
        open={isTemplatesModalOpen}
        onOpenChange={onTemplatesModalOpenChange}
        onImport={handleImportTemplate}
      />
    </div>
  )
}

function EditorCanvas({
  isTemplatesModalOpen = false,
  onTemplatesModalOpenChange,
  projectId,
  getToken,
  onSaveStatusChange,
}) {
  return (
    <ReactFlowProvider>
      <CanvasSurface
        isTemplatesModalOpen={isTemplatesModalOpen}
        onTemplatesModalOpenChange={onTemplatesModalOpenChange}
        projectId={projectId}
        getToken={getToken}
        onSaveStatusChange={onSaveStatusChange}
      />
    </ReactFlowProvider>
  )
}

export { EditorCanvas }
