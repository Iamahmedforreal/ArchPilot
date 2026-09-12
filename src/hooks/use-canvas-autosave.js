import { useEffect, useRef } from "react"

import { fetchCanvas, saveCanvas } from "@/lib/project-api"

const AUTOSAVE_DELAY_MS = 800

function serializeCanvas(nodes, edges) {
  return JSON.stringify({ nodes, edges })
}

function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  getToken,
  enabled,
  initialRevision,
  baselineKey,
  onStatusChange,
}) {
  const lastSavedCanvasRef = useRef(null)
  const lastSavedRevisionRef = useRef(null)
  const saveRequestRef = useRef(0)
  const baselineKeyRef = useRef(null)

  useEffect(() => {
    saveRequestRef.current += 1

    if (!enabled || !projectId) {
      lastSavedCanvasRef.current = null
      lastSavedRevisionRef.current = null
      baselineKeyRef.current = null
      return
    }

    if (baselineKeyRef.current === baselineKey) {
      return
    }

    baselineKeyRef.current = baselineKey
    lastSavedCanvasRef.current = serializeCanvas(nodes, edges)
    lastSavedRevisionRef.current = initialRevision ?? null
    onStatusChange("idle")
  }, [
    baselineKey,
    edges,
    enabled,
    initialRevision,
    nodes,
    onStatusChange,
    projectId,
  ])

  useEffect(() => {
    if (!projectId || !enabled) {
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

        const saveResult = await saveCanvas(
          token,
          projectId,
          JSON.parse(serializedCanvas),
          lastSavedRevisionRef.current
        )
        if (requestId !== saveRequestRef.current) {
          return
        }

        lastSavedCanvasRef.current = serializedCanvas
        lastSavedRevisionRef.current = saveResult.revision
        onStatusChange("saved")
      } catch (error) {
        if (requestId === saveRequestRef.current) {
          if (error.status === 409) {
            try {
              const token = await getToken()
              const savedCanvas = token
                ? await fetchCanvas(token, projectId)
                : null

              if (savedCanvas) {
                lastSavedCanvasRef.current = serializeCanvas(
                  savedCanvas.nodes,
                  savedCanvas.edges
                )
                lastSavedRevisionRef.current = savedCanvas.revision
              }
            } catch (refreshError) {
              console.error(refreshError)
            }
          }

          console.error(error)
          onStatusChange("error")
        }
      }
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(saveTimeout)
  }, [edges, enabled, getToken, nodes, onStatusChange, projectId])
}

export { useCanvasAutosave }
