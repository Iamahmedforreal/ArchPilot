import { useEffect, useRef, useState } from "react"

import { fetchCanvas, saveCanvas } from "@/lib/project-api"

const AUTOSAVE_DELAY_MS = 800

function serializeCanvas(nodes, edges) {
  return JSON.stringify({ nodes, edges })
}

function hasCanvasContent(nodes, edges) {
  return nodes.length > 0 || edges.length > 0
}

function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  setNodes,
  setEdges,
  getToken,
  onStatusChange,
}) {
  const [isReady, setIsReady] = useState(false)
  const lastSavedCanvasRef = useRef(null)
  const currentCanvasRef = useRef({ nodes, edges })
  const saveRequestRef = useRef(0)

  useEffect(() => {
    currentCanvasRef.current = { nodes, edges }
  }, [edges, nodes])

  useEffect(() => {
    let cancelled = false

    async function loadCanvas() {
      setIsReady(false)
      lastSavedCanvasRef.current = null

      if (!projectId) {
        onStatusChange("idle")
        setIsReady(true)
        return
      }

      const initialCanvas = currentCanvasRef.current
      if (hasCanvasContent(initialCanvas.nodes, initialCanvas.edges)) {
        lastSavedCanvasRef.current = serializeCanvas(
          initialCanvas.nodes,
          initialCanvas.edges
        )
        onStatusChange("idle")
        setIsReady(true)
        return
      }

      try {
        const token = await getToken()
        if (!token || cancelled) {
          return
        }

        const savedCanvas = await fetchCanvas(token, projectId)
        const currentCanvas = currentCanvasRef.current

        if (
          !cancelled &&
          savedCanvas &&
          !hasCanvasContent(currentCanvas.nodes, currentCanvas.edges)
        ) {
          setNodes(savedCanvas.nodes)
          setEdges(savedCanvas.edges)
          lastSavedCanvasRef.current = serializeCanvas(
            savedCanvas.nodes,
            savedCanvas.edges
          )
        }

        if (!cancelled && !savedCanvas) {
          lastSavedCanvasRef.current = serializeCanvas([], [])
        }

        if (!cancelled) {
          onStatusChange("idle")
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          onStatusChange("error")
        }
      } finally {
        if (!cancelled) {
          setIsReady(true)
        }
      }
    }

    loadCanvas()

    return () => {
      cancelled = true
    }
  }, [getToken, onStatusChange, projectId, setEdges, setNodes])

  useEffect(() => {
    if (!projectId || !isReady) {
      return
    }

    const serializedCanvas = serializeCanvas(nodes, edges)
    if (serializedCanvas === lastSavedCanvasRef.current) {
      return
    }

    const requestId = saveRequestRef.current + 1
    saveRequestRef.current = requestId
    onStatusChange("saving")

    const saveTimeout = window.setTimeout(async () => {
      try {
        const token = await getToken()
        if (!token) {
          throw new Error("Missing project session token")
        }

        await saveCanvas(token, projectId, JSON.parse(serializedCanvas))
        if (requestId !== saveRequestRef.current) {
          return
        }

        lastSavedCanvasRef.current = serializedCanvas
        onStatusChange("saved")
      } catch (error) {
        if (requestId === saveRequestRef.current) {
          console.error(error)
          onStatusChange("error")
        }
      }
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(saveTimeout)
  }, [edges, getToken, isReady, nodes, onStatusChange, projectId])
}

export { useCanvasAutosave }
