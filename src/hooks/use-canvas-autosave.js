import { useCallback, useEffect, useRef } from "react"

import { fetchCanvas, saveCanvas } from "@/lib/project-api"

const AUTOSAVE_DELAY_MS = 2000

/** Excludes selection and dragging state before comparing or saving a canvas. */
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

/** Serializes a normalized canvas snapshot for dirty-state comparisons. */
function serializeCanvasSnapshot(snapshot) {
  return JSON.stringify(snapshot)
}

/** Tracks confirmed canvas revisions and provides debounced and manual saves. */
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
  const activeSavePromiseRef = useRef(null)
  const queuedManualSaveRef = useRef(false)
  const saveRequestRef = useRef(0)
  const hasConflictRef = useRef(false)

  const clearPendingTimer = useCallback(() => {
    if (pendingSaveTimeoutRef.current !== null) {
      window.clearTimeout(pendingSaveTimeoutRef.current)
      pendingSaveTimeoutRef.current = null
    }
  }, [])

  const runSaveLoop = useCallback(
    async ({ manual = false } = {}) => {
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
            if (error.status === 409) {
              hasConflictRef.current = true
              onStatusChange("conflict")
            } else {
              onStatusChange("error")
            }
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
    [getToken, isSavePaused, onStatusChange, projectId]
  )

  const saveLatestCanvas = useCallback(
    async ({ manual = false } = {}) => {
      clearPendingTimer()

      if (!projectId || !enabled) {
        return lastConfirmedRevisionRef.current
      }

      if (hasConflictRef.current) {
        onStatusChange("conflict")
        return lastConfirmedRevisionRef.current
      }

      if (isSaveInFlightRef.current) {
        if (manual) {
          queuedManualSaveRef.current = true
          onStatusChange("unsaved")
          return await (activeSavePromiseRef.current ??
            Promise.resolve(lastConfirmedRevisionRef.current))
        }

        return lastConfirmedRevisionRef.current
      }

      const savePromise = runSaveLoop({ manual })
      activeSavePromiseRef.current = savePromise

      try {
        return await savePromise
      } finally {
        if (activeSavePromiseRef.current === savePromise) {
          activeSavePromiseRef.current = null
        }
      }
    },
    [clearPendingTimer, enabled, onStatusChange, projectId, runSaveLoop]
  )

  const scheduleAutosave = useCallback(() => {
    clearPendingTimer()

    if (!projectId || !enabled || isSavePaused || hasConflictRef.current) {
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
      activeSavePromiseRef.current = null
      queuedManualSaveRef.current = false
      hasConflictRef.current = false
      return
    }

    if (baselineKeyRef.current !== baselineKey) {
      clearPendingTimer()
      baselineKeyRef.current = baselineKey
      lastConfirmedSerializedRef.current = serializedSnapshot
      lastConfirmedRevisionRef.current = initialRevision ?? null
      isSaveInFlightRef.current = false
      activeSavePromiseRef.current = null
      queuedManualSaveRef.current = false
      hasConflictRef.current = false
      onStatusChange("idle")
      return
    }

    if (hasConflictRef.current) {
      onStatusChange("conflict")
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
      activeSavePromiseRef.current = null
    }
  }, [clearPendingTimer])

  const flushCanvasSave = useCallback(async () => {
    clearPendingTimer()
    return await saveLatestCanvas({ manual: true })
  }, [clearPendingTimer, saveLatestCanvas])

  const overwriteConflictWithLocalCanvas = useCallback(async () => {
    clearPendingTimer()

    if (!projectId || !enabled) {
      return lastConfirmedRevisionRef.current
    }

    if (isSaveInFlightRef.current) {
      queuedManualSaveRef.current = true
      return await (activeSavePromiseRef.current ??
        Promise.resolve(lastConfirmedRevisionRef.current))
    }

    onStatusChange("saving")

    try {
      const token = await getToken()
      if (!token) {
        throw new Error("Missing project session token")
      }

      const serverCanvas = await fetchCanvas(token, projectId)
      const serverSnapshot = stripTransientCanvasState(
        serverCanvas?.nodes ?? [],
        serverCanvas?.edges ?? []
      )

      lastConfirmedRevisionRef.current = serverCanvas?.revision ?? null
      lastConfirmedSerializedRef.current = serializeCanvasSnapshot(serverSnapshot)
      hasConflictRef.current = false

      return await saveLatestCanvas({ manual: true })
    } catch (error) {
      hasConflictRef.current = true
      onStatusChange("conflict")
      throw error
    }
  }, [
    clearPendingTimer,
    enabled,
    getToken,
    onStatusChange,
    projectId,
    saveLatestCanvas,
  ])

  return { flushCanvasSave, overwriteConflictWithLocalCanvas }
}

export { useCanvasAutosave }
