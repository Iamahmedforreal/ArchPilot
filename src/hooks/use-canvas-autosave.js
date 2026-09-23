import { useCallback, useEffect, useRef } from "react"

import { saveCanvas } from "@/lib/project-api"

const AUTOSAVE_DELAY_MS = 2000

function stripTransientCanvasState(nodes, edges) {
  return {
    nodes: nodes.map((node) => {
      const nextNode = { ...node }
      delete nextNode.selected
      delete nextNode.dragging

      return {
        ...nextNode,
        position: { ...node.position },
        data: {
          ...node.data,
          size: node.data?.size ? { ...node.data.size } : undefined,
        },
      }
    }),
    edges: edges.map((edge) => {
      const nextEdge = { ...edge }
      delete nextEdge.selected

      return {
        ...nextEdge,
        style: edge.style ? { ...edge.style } : undefined,
        markerEnd: edge.markerEnd ? { ...edge.markerEnd } : undefined,
      }
    }),
  }
}

function serializeCanvasSnapshot(snapshot) {
  return JSON.stringify(snapshot)
}

function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  getToken,
  enabled,
  initialRevision,
  baselineKey,
  isSavePaused = false,
  onStatusChange,
}) {
  const baselineKeyRef = useRef(null)
  const latestSnapshotRef = useRef(stripTransientCanvasState(nodes, edges))
  const latestSerializedRef = useRef(null)
  const lastConfirmedSerializedRef = useRef(null)
  const lastConfirmedRevisionRef = useRef(null)
  const pendingSaveTimeoutRef = useRef(null)
  const isSaveInFlightRef = useRef(false)
  const queuedManualSaveRef = useRef(false)
  const saveRequestRef = useRef(0)

  const clearPendingTimer = useCallback(() => {
    if (pendingSaveTimeoutRef.current !== null) {
      window.clearTimeout(pendingSaveTimeoutRef.current)
      pendingSaveTimeoutRef.current = null
    }
  }, [])

  const saveLatestCanvas = useCallback(
    async ({ manual = false } = {}) => {
      clearPendingTimer()

      if (!projectId || !enabled) {
        return lastConfirmedRevisionRef.current
      }

      if (isSaveInFlightRef.current) {
        if (manual) {
          queuedManualSaveRef.current = true
        }
        onStatusChange("unsaved")
        return lastConfirmedRevisionRef.current
      }

      if (latestSerializedRef.current === lastConfirmedSerializedRef.current) {
        queuedManualSaveRef.current = false
        onStatusChange("saved")
        return lastConfirmedRevisionRef.current
      }

      let shouldSaveAgain = true
      let shouldBypassPause = manual
      let latestRevision = lastConfirmedRevisionRef.current

      while (shouldSaveAgain) {
        shouldSaveAgain = false

        if (latestSerializedRef.current === lastConfirmedSerializedRef.current) {
          queuedManualSaveRef.current = false
          onStatusChange("saved")
          return lastConfirmedRevisionRef.current
        }

        const requestId = saveRequestRef.current + 1
        saveRequestRef.current = requestId
        isSaveInFlightRef.current = true
        queuedManualSaveRef.current = false
        const snapshot = latestSnapshotRef.current
        const serializedSnapshot = latestSerializedRef.current
        onStatusChange("saving")

        try {
          const token = await getToken()
          if (!token) {
            throw new Error("Missing project session token")
          }

          const saveResult = await saveCanvas(
            token,
            projectId,
            snapshot,
            lastConfirmedRevisionRef.current
          )
          if (requestId !== saveRequestRef.current) {
            return lastConfirmedRevisionRef.current
          }

          latestRevision = saveResult.revision
          lastConfirmedRevisionRef.current = saveResult.revision
          lastConfirmedSerializedRef.current = serializedSnapshot
        } catch (error) {
          if (requestId === saveRequestRef.current) {
            onStatusChange(error.status === 409 ? "conflict" : "error")
          }
          throw error
        } finally {
          if (requestId === saveRequestRef.current) {
            isSaveInFlightRef.current = false
          }
        }

        if (latestSerializedRef.current === serializedSnapshot) {
          queuedManualSaveRef.current = false
          onStatusChange("saved")
          return latestRevision
        }

        onStatusChange("unsaved")
        shouldBypassPause = shouldBypassPause || queuedManualSaveRef.current
        if (!isSavePaused || shouldBypassPause) {
          shouldSaveAgain = true
        }
      }

      return latestRevision
    },
    [clearPendingTimer, enabled, getToken, isSavePaused, onStatusChange, projectId]
  )

  const scheduleAutosave = useCallback(() => {
    clearPendingTimer()

    if (!projectId || !enabled || isSavePaused) {
      return
    }
    if (latestSerializedRef.current === lastConfirmedSerializedRef.current) {
      return
    }
    if (isSaveInFlightRef.current) {
      return
    }

    pendingSaveTimeoutRef.current = window.setTimeout(() => {
      pendingSaveTimeoutRef.current = null
      saveLatestCanvas().catch((error) => {
        console.error(error)
      })
    }, AUTOSAVE_DELAY_MS)
  }, [clearPendingTimer, enabled, isSavePaused, projectId, saveLatestCanvas])

  useEffect(() => {
    const snapshot = stripTransientCanvasState(nodes, edges)
    const serializedSnapshot = serializeCanvasSnapshot(snapshot)
    latestSnapshotRef.current = snapshot
    latestSerializedRef.current = serializedSnapshot

    if (!enabled || !projectId) {
      clearPendingTimer()
      baselineKeyRef.current = null
      lastConfirmedSerializedRef.current = null
      lastConfirmedRevisionRef.current = null
      isSaveInFlightRef.current = false
      queuedManualSaveRef.current = false
      return
    }

    if (baselineKeyRef.current !== baselineKey) {
      clearPendingTimer()
      baselineKeyRef.current = baselineKey
      lastConfirmedSerializedRef.current = serializedSnapshot
      lastConfirmedRevisionRef.current = initialRevision ?? null
      isSaveInFlightRef.current = false
      queuedManualSaveRef.current = false
      onStatusChange("idle")
      return
    }

    if (serializedSnapshot !== lastConfirmedSerializedRef.current) {
      onStatusChange("unsaved")
      scheduleAutosave()
    }
  }, [
    baselineKey,
    clearPendingTimer,
    edges,
    enabled,
    initialRevision,
    nodes,
    onStatusChange,
    projectId,
    scheduleAutosave,
  ])

  useEffect(() => {
    if (!isSavePaused) {
      scheduleAutosave()
    }
  }, [isSavePaused, scheduleAutosave])

  useEffect(() => {
    return () => {
      clearPendingTimer()
      saveRequestRef.current += 1
    }
  }, [clearPendingTimer])

  const flushCanvasSave = useCallback(async () => {
    clearPendingTimer()
    return await saveLatestCanvas({ manual: true })
  }, [clearPendingTimer, saveLatestCanvas])

  return { flushCanvasSave }
}

export { useCanvasAutosave }
