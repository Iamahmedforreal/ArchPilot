import { useCallback, useEffect, useRef } from "react"

import { fetchCanvas, saveCanvas } from "@/lib/project-api"

const AUTOSAVE_DELAY_MS = 800

function serializeCanvas(nodes, edges) {
  return JSON.stringify({ nodes, edges })
}

function hasChangedAfterSave(currentItem, savedItem) {
  return JSON.stringify(currentItem) !== JSON.stringify(savedItem)
}

function reconcileItems(serverItems, savedItems, currentItems) {
  const savedById = new Map(savedItems.map((item) => [item.id, item]))
  const currentById = new Map(currentItems.map((item) => [item.id, item]))
  const reconciledById = new Map(serverItems.map((item) => [item.id, item]))

  for (const savedItem of savedItems) {
    if (!currentById.has(savedItem.id)) {
      reconciledById.delete(savedItem.id)
    }
  }

  for (const currentItem of currentItems) {
    const savedItem = savedById.get(currentItem.id)

    if (!savedItem || hasChangedAfterSave(currentItem, savedItem)) {
      reconciledById.set(currentItem.id, currentItem)
    }
  }

  return Array.from(reconciledById.values())
}

function reconcileCanvasConflict(serverCanvas, savedCanvas, currentCanvas) {
  return {
    nodes: reconcileItems(
      serverCanvas.nodes ?? [],
      savedCanvas.nodes ?? [],
      currentCanvas.nodes ?? []
    ),
    edges: reconcileItems(
      serverCanvas.edges ?? [],
      savedCanvas.edges ?? [],
      currentCanvas.edges ?? []
    ),
    revision: serverCanvas.revision ?? null,
  }
}

function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  getToken,
  enabled,
  initialRevision,
  baselineKey,
  onConflict,
  onStatusChange,
}) {
  const lastSavedCanvasRef = useRef(null)
  const lastSavedRevisionRef = useRef(null)
  const saveRequestRef = useRef(0)
  const baselineKeyRef = useRef(null)
  const isReconcilingConflictRef = useRef(false)
  const currentCanvasRef = useRef({ nodes, edges })

  useEffect(() => {
    currentCanvasRef.current = { nodes, edges }
  }, [edges, nodes])

  useEffect(() => {
    saveRequestRef.current += 1

    if (!enabled || !projectId) {
      lastSavedCanvasRef.current = null
      lastSavedRevisionRef.current = null
      baselineKeyRef.current = null
      isReconcilingConflictRef.current = false
      return
    }

    if (
      baselineKeyRef.current === baselineKey ||
      isReconcilingConflictRef.current
    ) {
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
    if (!projectId || !enabled || isReconcilingConflictRef.current) {
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
            isReconcilingConflictRef.current = true

            try {
              const token = await getToken()
              if (!token) {
                throw new Error("Missing project session token", {
                  cause: error,
                })
              }

              const savedCanvas = await fetchCanvas(token, projectId)
              const serverCanvas = savedCanvas ?? {
                nodes: [],
                edges: [],
                revision: null,
              }
              const savedAttemptCanvas = JSON.parse(serializedCanvas)
              const reconciledCanvas = reconcileCanvasConflict(
                serverCanvas,
                savedAttemptCanvas,
                currentCanvasRef.current
              )
              await onConflict?.(reconciledCanvas)

              const serverSerializedCanvas = serializeCanvas(
                serverCanvas.nodes,
                serverCanvas.edges
              )
              const reconciledSerializedCanvas = serializeCanvas(
                reconciledCanvas.nodes,
                reconciledCanvas.edges
              )
              lastSavedCanvasRef.current = serializeCanvas(
                serverCanvas.nodes,
                serverCanvas.edges
              )
              lastSavedRevisionRef.current = serverCanvas.revision
              onStatusChange(
                reconciledSerializedCanvas === serverSerializedCanvas
                  ? "saved"
                  : "saving"
              )
              return
            } catch (refreshError) {
              console.error(refreshError)
            } finally {
              isReconcilingConflictRef.current = false
            }
          }

          console.error(error)
          onStatusChange("error")
        }
      }
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(saveTimeout)
  }, [edges, enabled, getToken, nodes, onConflict, onStatusChange, projectId])

  const flushCanvasSave = useCallback(async () => {
    if (!projectId || !enabled || isReconcilingConflictRef.current) {
      return lastSavedRevisionRef.current
    }

    const serializedCanvas = serializeCanvas(nodes, edges)
    if (serializedCanvas === lastSavedCanvasRef.current) {
      return lastSavedRevisionRef.current
    }

    const requestId = saveRequestRef.current + 1
    saveRequestRef.current = requestId
    onStatusChange("saving")

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
      return lastSavedRevisionRef.current
    }

    lastSavedCanvasRef.current = serializedCanvas
    lastSavedRevisionRef.current = saveResult.revision
    onStatusChange("saved")
    return saveResult.revision
  }, [edges, enabled, getToken, nodes, onStatusChange, projectId])

  return { flushCanvasSave }
}

export { useCanvasAutosave }
