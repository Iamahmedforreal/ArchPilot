import { useCallback, useEffect, useRef, useState } from "react"

import { validateAiCanvasProposal } from "@/lib/ai-canvas"
import { fetchAiRun, submitAiDesign } from "@/lib/project-api"

const POLL_INTERVAL_MS = 1750
const MAX_POLL_WINDOW_MS = 120000
const MAX_BACKOFF_MS = 8000

const initialWorkflow = {
  projectId: null,
  phase: "idle",
  runId: null,
  statusMessage: null,
  proposal: null,
  requiresReplacement: false,
}

function getRunStatusMessage(run) {
  if (run.status === "PENDING") {
    return "Waiting to start..."
  }

  if (run.status === "RUNNING") {
    if (run.stage === "preparing") {
      return "Preparing your design..."
    }
    if (run.stage === "generation") {
      return "Designing your architecture..."
    }
    return "Working on your design..."
  }

  if (run.status === "SUCCEEDED") {
    return "Design ready"
  }

  if (run.status === "CANCELLED") {
    return "Generation cancelled"
  }

  return run.error?.message || "The design could not be generated."
}

function waitForNextPoll(delay, signal) {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, delay)
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId)
        resolve()
      },
      { once: true }
    )
  })
}

function useAiDesign({ projectId, getToken, canvasControllerRef }) {
  const [workflow, setWorkflow] = useState(initialWorkflow)
  const [pollSession, setPollSession] = useState(null)
  const generationRef = useRef(0)
  const submitAbortRef = useRef(null)
  const appliedRunsRef = useRef(new Set())
  const activeRequestRef = useRef(false)

  const visibleWorkflow =
    workflow.projectId === projectId ? workflow : initialWorkflow

  const isActive =
    visibleWorkflow.phase === "submitting" || visibleWorkflow.phase === "polling"

  const submit = useCallback(
    async (prompt) => {
      const message = prompt.trim()
      const canvasMeta = canvasControllerRef.current?.getCanvasMeta()

      if (!message || activeRequestRef.current) {
        return false
      }

      if (!projectId) {
        setWorkflow({
          ...initialWorkflow,
          phase: "failed",
          statusMessage: "Open a saved project before requesting a design.",
        })
        return false
      }

      if (!canvasMeta?.isReady) {
        setWorkflow({
          ...initialWorkflow,
          projectId,
          phase: "failed",
          statusMessage: "The canvas is still loading. Try again in a moment.",
        })
        return false
      }

      activeRequestRef.current = true
      const generation = generationRef.current + 1
      generationRef.current = generation
      submitAbortRef.current?.abort()
      const abortController = new AbortController()
      submitAbortRef.current = abortController
      setPollSession(null)
      setWorkflow({
        ...initialWorkflow,
        projectId,
        phase: "submitting",
        statusMessage: "Submitting request...",
      })

      try {
        const token = await getToken()
        if (!token) {
          throw new Error("Your session is no longer available.")
        }

        const run = await submitAiDesign(token, projectId, message, {
          signal: abortController.signal,
        })
        if (generation !== generationRef.current) {
          activeRequestRef.current = false
          return false
        }

        const session = {
          generation,
          projectId,
          runId: run.run_id,
          startedAt: Date.now(),
          submittedCanvasGeneration: canvasMeta.generation,
          submittedCanvasWasEmpty: canvasMeta.isEmpty,
        }
        setWorkflow({
          ...initialWorkflow,
          projectId,
          phase: "polling",
          runId: run.run_id,
          statusMessage: getRunStatusMessage(run),
        })
        setPollSession(session)
        return true
      } catch (error) {
        if (
          error.name === "AbortError" ||
          generation !== generationRef.current
        ) {
          activeRequestRef.current = false
          return false
        }

        activeRequestRef.current = false
        setWorkflow({
          ...initialWorkflow,
          projectId,
          phase: "failed",
          statusMessage:
            error.detail || "The design request could not be submitted. Try again.",
        })
        return false
      }
    },
    [canvasControllerRef, getToken, projectId]
  )

  useEffect(() => {
    if (!pollSession) {
      return
    }

    const abortController = new AbortController()
    let consecutiveFailures = 0

    async function poll() {
      await waitForNextPoll(POLL_INTERVAL_MS, abortController.signal)

      while (!abortController.signal.aborted) {
        if (
          pollSession.generation !== generationRef.current ||
          pollSession.projectId !== projectId
        ) {
          return
        }

        if (Date.now() - pollSession.startedAt >= MAX_POLL_WINDOW_MS) {
          setWorkflow((current) => ({
            ...current,
            phase: "paused",
            statusMessage: "Still working. Check the status again when ready.",
          }))
          activeRequestRef.current = false
          setPollSession(null)
          return
        }

        try {
          const token = await getToken()
          if (!token) {
            throw Object.assign(new Error("Session unavailable"), { status: 401 })
          }

          const run = await fetchAiRun(
            token,
            pollSession.projectId,
            pollSession.runId,
            { signal: abortController.signal }
          )
          if (abortController.signal.aborted) {
            return
          }

          consecutiveFailures = 0
          if (run.status === "PENDING" || run.status === "RUNNING") {
            setWorkflow((current) => ({
              ...current,
              phase: "polling",
              statusMessage: getRunStatusMessage(run),
            }))
            await waitForNextPoll(POLL_INTERVAL_MS, abortController.signal)
            continue
          }

          if (run.status === "SUCCEEDED") {
            try {
              const proposal = validateAiCanvasProposal(run.result)
              const currentCanvas = canvasControllerRef.current?.getCanvasMeta()
              const canApplyAutomatically =
                pollSession.submittedCanvasWasEmpty &&
                currentCanvas?.isEmpty &&
                currentCanvas.generation ===
                  pollSession.submittedCanvasGeneration

              if (
                canApplyAutomatically &&
                !appliedRunsRef.current.has(run.run_id)
              ) {
                appliedRunsRef.current.add(run.run_id)
                canvasControllerRef.current.applyAiCanvas(proposal)
                setWorkflow({
                  ...initialWorkflow,
                  projectId: pollSession.projectId,
                  phase: "applied",
                  runId: run.run_id,
                  statusMessage: "Design applied",
                })
              } else {
                setWorkflow({
                  ...initialWorkflow,
                  projectId: pollSession.projectId,
                  phase: "ready",
                  runId: run.run_id,
                  statusMessage: "Design ready",
                  proposal,
                  requiresReplacement: true,
                })
              }
            } catch {
              setWorkflow({
                ...initialWorkflow,
                projectId: pollSession.projectId,
                phase: "failed",
                runId: run.run_id,
                statusMessage: "The generated design could not be opened.",
              })
            }
            activeRequestRef.current = false
            setPollSession(null)
            return
          }

          setWorkflow({
            ...initialWorkflow,
            projectId: pollSession.projectId,
            phase: run.status === "CANCELLED" ? "cancelled" : "failed",
            runId: run.run_id,
            statusMessage: getRunStatusMessage(run),
          })
          activeRequestRef.current = false
          setPollSession(null)
          return
        } catch (error) {
          if (error.name === "AbortError" || abortController.signal.aborted) {
            return
          }

          if ([401, 403, 404].includes(error.status)) {
            setWorkflow({
              ...initialWorkflow,
              projectId: pollSession.projectId,
              phase: "failed",
              runId: pollSession.runId,
              statusMessage: "This design run is no longer accessible.",
            })
            activeRequestRef.current = false
            setPollSession(null)
            return
          }

          consecutiveFailures += 1
          setWorkflow((current) => ({
            ...current,
            statusMessage: "Connection interrupted. Checking again...",
          }))
          const backoff = Math.min(
            POLL_INTERVAL_MS * 2 ** consecutiveFailures,
            MAX_BACKOFF_MS
          )
          await waitForNextPoll(backoff, abortController.signal)
        }
      }
    }

    poll()
    return () => abortController.abort()
  }, [canvasControllerRef, getToken, pollSession, projectId])

  useEffect(() => {
    return () => {
      generationRef.current += 1
      activeRequestRef.current = false
      submitAbortRef.current?.abort()
    }
  }, [projectId])

  const applyProposal = useCallback(() => {
    if (
      visibleWorkflow.phase !== "ready" ||
      !visibleWorkflow.proposal ||
      !visibleWorkflow.runId ||
      appliedRunsRef.current.has(visibleWorkflow.runId)
    ) {
      return
    }

    appliedRunsRef.current.add(visibleWorkflow.runId)
    canvasControllerRef.current?.applyAiCanvas(visibleWorkflow.proposal)
    setWorkflow((current) => ({
      ...current,
      phase: "applied",
      statusMessage: "Design applied",
      proposal: null,
      requiresReplacement: false,
    }))
  }, [canvasControllerRef, visibleWorkflow])

  const checkStatusAgain = useCallback(() => {
    if (
      visibleWorkflow.phase !== "paused" ||
      !visibleWorkflow.runId ||
      !projectId
    ) {
      return
    }

    const generation = generationRef.current
    activeRequestRef.current = true
    setWorkflow((current) => ({
      ...current,
      phase: "polling",
      statusMessage: "Checking design status...",
    }))
    setPollSession({
      generation,
      projectId,
      runId: visibleWorkflow.runId,
      startedAt: Date.now(),
      submittedCanvasGeneration:
        canvasControllerRef.current?.getCanvasMeta().generation ?? -1,
      submittedCanvasWasEmpty: false,
    })
  }, [canvasControllerRef, projectId, visibleWorkflow])

  return {
    workflow: visibleWorkflow,
    isActive,
    submit,
    applyProposal,
    checkStatusAgain,
  }
}

export { getRunStatusMessage, useAiDesign }
