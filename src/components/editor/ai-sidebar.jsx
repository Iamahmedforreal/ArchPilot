import { useEffect, useEffectEvent, useId, useRef, useState } from "react"
import {
  ArrowUp,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Replace,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { downloadProjectFile, fetchAiRun, submitAiSpec } from "@/lib/project-api"
import { cn } from "@/lib/utils"

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Design a Uber clone architecture",
]
const MAX_PROMPT_HEIGHT = 192

function getIsMobileDialogViewport() {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia("(max-width: 767px)").matches
}

function ChatBubble({ message }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] overflow-hidden break-words rounded-xl px-3 py-2 text-sm leading-5 [overflow-wrap:anywhere]",
          isUser
            ? "border border-brand/50 bg-accent-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-ai-text"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function WorkflowStatus({ workflow, isWorking, onApply, onCheckStatusAgain }) {
  if (!workflow.statusMessage) {
    return null
  }

  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className="max-w-[88%] rounded-xl border border-surface-border bg-elevated px-3 py-2 text-sm leading-5 text-ai-text">
        <div className="flex items-start gap-2">
          {isWorking && (
            <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand motion-reduce:animate-none" />
          )}
          <span className="break-words [overflow-wrap:anywhere]">
            {workflow.statusMessage}
          </span>
        </div>
        {workflow.phase === "ready" && workflow.requiresReplacement && (
          <Button
            type="button"
            size="sm"
            onClick={onApply}
            className="mt-2 h-8 gap-2 rounded-lg"
          >
            <Replace className="h-3.5 w-3.5" />
            Replace canvas
          </Button>
        )}
        {workflow.phase === "paused" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCheckStatusAgain}
            className="mt-2 h-8 gap-2 rounded-lg border-surface-border"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Check status again
          </Button>
        )}
      </div>
    </div>
  )
}

function AiArchitectTab({
  draft,
  isWorking,
  messages,
  workflow,
  onApplyProposal,
  onCheckStatusAgain,
  onDraftChange,
  onSubmitMessage,
}) {
  const textareaRef = useRef(null)
  const scrollbarHideTimeoutRef = useRef(null)
  const isMessagesPointerInsideRef = useRef(false)
  const isMessagesFocusInsideRef = useRef(false)
  const [isMessagesScrollActive, setIsMessagesScrollActive] = useState(false)

  useEffect(() => {
    return () => {
      if (scrollbarHideTimeoutRef.current !== null) {
        window.clearTimeout(scrollbarHideTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_PROMPT_HEIGHT)}px`
  }, [draft])

  function handleKeyDown(event) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }

    event.preventDefault()
    onSubmitMessage()
  }

  const canSubmit = draft.trim().length > 0 && !isWorking

  function showMessagesScrollbar() {
    setIsMessagesScrollActive(true)

    if (scrollbarHideTimeoutRef.current !== null) {
      window.clearTimeout(scrollbarHideTimeoutRef.current)
      scrollbarHideTimeoutRef.current = null
    }
  }

  function hideMessagesScrollbarSoon() {
    if (
      isMessagesPointerInsideRef.current ||
      isMessagesFocusInsideRef.current
    ) {
      return
    }

    if (scrollbarHideTimeoutRef.current !== null) {
      window.clearTimeout(scrollbarHideTimeoutRef.current)
    }

    scrollbarHideTimeoutRef.current = window.setTimeout(() => {
      setIsMessagesScrollActive(false)
      scrollbarHideTimeoutRef.current = null
    }, 800)
  }

  function handleMessagesPointerEnter() {
    isMessagesPointerInsideRef.current = true
    showMessagesScrollbar()
  }

  function handleMessagesPointerLeave() {
    isMessagesPointerInsideRef.current = false
    hideMessagesScrollbarSoon()
  }

  function handleMessagesFocusCapture() {
    isMessagesFocusInsideRef.current = true
    showMessagesScrollbar()
  }

  function handleMessagesBlurCapture(event) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return
    }

    isMessagesFocusInsideRef.current = false
    hideMessagesScrollbarSoon()
  }

  function handleMessagesScroll() {
    showMessagesScrollbar()
    hideMessagesScrollbarSoon()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "ai-chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
          isMessagesScrollActive && "ai-chat-scroll-active"
        )}
        onPointerEnter={handleMessagesPointerEnter}
        onPointerLeave={handleMessagesPointerLeave}
        onFocusCapture={handleMessagesFocusCapture}
        onBlurCapture={handleMessagesBlurCapture}
        onScroll={handleMessagesScroll}
      >
        {messages.length === 0 ? (
          <div className="py-1">
            <p className="text-sm font-semibold leading-5 text-copy-primary">
              How can I help with this design?
            </p>
            <p className="mt-1 text-xs leading-5 text-copy-muted">
              Choose a starting point or ask your own question.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="min-h-11 rounded-full border border-surface-border bg-elevated px-3 py-2 text-left text-xs font-medium leading-4 text-copy-secondary transition-colors hover:border-brand/60 hover:bg-accent-dim hover:text-brand"
                  onClick={() => onSubmitMessage(prompt)}
                  disabled={isWorking}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <WorkflowStatus
              workflow={workflow}
              isWorking={isWorking}
              onApply={onApplyProposal}
              onCheckStatusAgain={onCheckStatusAgain}
            />
          </div>
        )}
        {messages.length === 0 && (
          <WorkflowStatus
            workflow={workflow}
            isWorking={isWorking}
            onApply={onApplyProposal}
            onCheckStatusAgain={onCheckStatusAgain}
          />
        )}
      </div>

      <div className="mt-2 shrink-0 border-t border-surface-border bg-transparent pt-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={draft}
            placeholder="Ask for follow-up changes..."
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="ai-composer-scroll max-h-48 min-h-14 resize-none overflow-y-auto rounded-2xl border border-surface-border bg-elevated px-3.5 py-3.5 pr-14 text-sm leading-5 text-copy-primary shadow-inner shadow-black/20 placeholder:text-copy-muted focus-visible:border-brand/60 focus-visible:ring-1 focus-visible:ring-brand/30"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Send message"
            title="Send"
            onClick={() => onSubmitMessage()}
            disabled={!canSubmit}
            className={cn(
              "group/button absolute bottom-2 right-2 h-9 w-9 rounded-full shadow-lg transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-95 disabled:cursor-not-allowed",
              canSubmit
                ? "bg-brand text-primary-foreground hover:-translate-y-0.5 hover:bg-brand-hover"
                : "bg-subtle text-copy-faint opacity-70"
            )}
          >
            <ArrowUp className="h-4 w-4 transition-transform duration-200 ease-out group-hover/button:-translate-y-0.5" />
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-copy-muted">
          AI can make mistakes, so double-check important details.
        </p>
      </div>
    </div>
  )
}

function SpecsTab({
  canvasControllerRef,
  getToken,
  projectId,
  specWorkflow,
  onDownloadSpec,
  onGenerateSpec,
}) {
  const isGenerating =
    specWorkflow.phase === "submitting" || specWorkflow.phase === "polling"
  const canGenerate = Boolean(projectId) && !isGenerating

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 pt-1">
      <Button
        type="button"
        disabled={!canGenerate}
        aria-label="Generate spec unavailable"
        onClick={() => onGenerateSpec({ canvasControllerRef, getToken, projectId })}
        className="h-9 w-full gap-2 rounded-xl bg-brand text-sm text-primary-foreground hover:bg-brand-hover"
      >
        {isGenerating ? (
          <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isGenerating ? "Generating spec" : "Generate spec"}
      </Button>

      <article className="rounded-xl border border-surface-border bg-elevated p-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-base text-brand">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-copy-primary">
              Architecture brief
            </h3>
            <p className="mt-1 text-xs leading-5 text-copy-muted">
              {specWorkflow.statusMessage ||
                "Create a Markdown overview from the saved canvas."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!specWorkflow.result}
          onClick={() => onDownloadSpec({ getToken, projectId })}
          className="mt-3 h-9 w-full gap-2 border-surface-border bg-transparent text-xs text-copy-muted"
        >
          <Download className="h-4 w-4" />
          Download spec
        </Button>
      </article>
    </div>
  )
}

function AiSidebar({
  canvasControllerRef,
  getToken,
  isOpen,
  onApplyProposal,
  onCheckStatusAgain,
  onClose,
  onOpen,
  onSubmit,
  projectId,
  workflow,
}) {
  const [activeTab, setActiveTab] = useState("architect")
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState([])
  const [specWorkflow, setSpecWorkflow] = useState({
    phase: "idle",
    runId: null,
    result: null,
    statusMessage: null,
  })
  const assistantTitleId = useId()
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const closeAssistant = useEffectEvent(onClose)
  const [isMobileDialog, setIsMobileDialog] = useState(getIsMobileDialogViewport)

  const isWorking =
    workflow.phase === "submitting" || workflow.phase === "polling"

  useEffect(() => {
    if (specWorkflow.phase !== "polling" || !specWorkflow.runId || !projectId) {
      return
    }

    let cancelled = false
    let timeoutId = null
    let isRequestPending = false

    async function pollSpecRun() {
      if (cancelled || isRequestPending) {
        return
      }

      isRequestPending = true
      try {
        const token = await getToken()
        if (!token || cancelled) {
          return
        }

        const run = await fetchAiRun(token, projectId, specWorkflow.runId)
        if (cancelled) {
          return
        }

        if (run.status === "PENDING" || run.status === "RUNNING") {
          setSpecWorkflow((current) => ({
            ...current,
            phase: "polling",
            statusMessage:
              run.stage === "generation"
                ? "Writing Markdown spec..."
                : "Preparing spec...",
          }))
          return
        }

        if (run.status === "SUCCEEDED") {
          setSpecWorkflow({
            phase: "ready",
            runId: run.run_id,
            result: run.result,
            statusMessage: "Spec ready to download.",
          })
          return
        }

        setSpecWorkflow({
          phase: "failed",
          runId: run.run_id,
          result: null,
          statusMessage: run.error?.message || "Spec generation failed.",
        })
      } catch (error) {
        if (!cancelled) {
          setSpecWorkflow((current) => ({
            ...current,
            phase: "failed",
          statusMessage:
              error.detail || "Spec status could not be checked.",
          }))
        }
      } finally {
        isRequestPending = false
        if (!cancelled) {
          timeoutId = window.setTimeout(pollSpecRun, 1750)
        }
      }
    }

    timeoutId = window.setTimeout(pollSpecRun, 1750)

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [getToken, projectId, specWorkflow.phase, specWorkflow.runId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)")

    function handleMediaQueryChange(event) {
      setIsMobileDialog(event.matches)
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaQueryChange)

      return () => {
        mediaQuery.removeEventListener("change", handleMediaQueryChange)
      }
    }

    mediaQuery.addListener(handleMediaQueryChange)

    return () => {
      mediaQuery.removeListener(handleMediaQueryChange)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !isMobileDialog) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const triggerElement = triggerRef.current
    const dialogElement = dialogRef.current
    const inertElements = []

    document.body.style.overflow = "hidden"

    if (dialogElement) {
      let currentElement = dialogElement
      let parentElement = currentElement.parentElement

      while (parentElement && parentElement !== document.body) {
        Array.from(parentElement.children).forEach((sibling) => {
          if (
            sibling === currentElement ||
            sibling.contains(currentElement) ||
            sibling.hasAttribute("data-ai-sidebar-backdrop")
          ) {
            return
          }

          inertElements.push({
            element: sibling,
            inert: sibling.inert,
            ariaHidden: sibling.getAttribute("aria-hidden"),
          })
          sibling.inert = true
          sibling.setAttribute("aria-hidden", "true")
        })

        currentElement = parentElement
        parentElement = parentElement.parentElement
      }
    }

    closeButtonRef.current?.focus()

    function getFocusableElements() {
      if (!dialogElement) {
        return []
      }

      return Array.from(
        dialogElement.querySelectorAll(
          [
            "a[href]",
            "button:not([disabled])",
            "textarea:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "[tabindex]:not([tabindex='-1'])",
          ].join(",")
        )
      ).filter((element) => {
        return !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
      })
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeAssistant()
        return
      }

      if (event.key !== "Tab" || !dialogElement) {
        return
      }

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialogElement.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      inertElements.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert

        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden")
        } else {
          element.setAttribute("aria-hidden", ariaHidden)
        }
      })
      window.removeEventListener("keydown", handleKeyDown)
      triggerElement?.focus()
    }
  }, [isOpen, isMobileDialog])

  async function submitMessage(nextContent = draft) {
    const content = nextContent.trim()

    if (!content || isWorking) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: crypto.randomUUID(), role: "user", content },
    ])
    const submitted = await onSubmit(content)

    if (submitted) {
      setDraft("")
    }
  }

  async function generateSpec({ canvasControllerRef, getToken, projectId }) {
    if (!projectId || specWorkflow.phase === "submitting" || specWorkflow.phase === "polling") {
      return
    }

    setSpecWorkflow({
      phase: "submitting",
      runId: null,
      result: null,
      statusMessage: "Saving canvas...",
    })

    try {
      const revision = await canvasControllerRef.current?.flushCanvasSave()
      if (!revision) {
        throw new Error("Save the canvas before generating a spec.")
      }

      const token = await getToken()
      if (!token) {
        throw new Error("Your session is no longer available.")
      }

      const run = await submitAiSpec(token, projectId, revision, null)
      setSpecWorkflow({
        phase: "polling",
        runId: run.run_id,
        result: null,
        statusMessage: "Generating spec...",
      })
    } catch (error) {
      setSpecWorkflow({
        phase: "failed",
        runId: null,
        result: null,
        statusMessage: error.detail || error.message || "Spec generation failed.",
      })
    }
  }

  async function downloadSpec({ getToken, projectId }) {
    if (!projectId || !specWorkflow.result?.file_id) {
      return
    }

    const token = await getToken()
    if (!token) {
      setSpecWorkflow((current) => ({
        ...current,
        phase: "failed",
        statusMessage: "Your session is no longer available.",
      }))
      return
    }

    await downloadProjectFile(
      token,
      projectId,
      specWorkflow.result.file_id,
      specWorkflow.result.filename || "architecture-spec.md"
    )
  }

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        onClick={onOpen}
        aria-label="Open AI assistant"
        className={cn(
          "fixed right-4 z-30 min-h-11 gap-2 rounded-full border border-surface-border bg-base/95 px-3 pr-4 text-copy-primary shadow-2xl backdrop-blur-xl hover:bg-elevated md:hidden",
          isOpen && "pointer-events-none opacity-0"
        )}
        style={{
          bottom: "max(5.75rem, calc(env(safe-area-inset-bottom) + 5rem))",
        }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-border bg-elevated text-brand">
          <Sparkles className={cn("h-4 w-4", isWorking && "animate-pulse")} />
        </span>
        <span className="text-sm font-medium">AI assistant</span>
      </Button>

      {isOpen && (
        <button
          type="button"
          data-ai-sidebar-backdrop
          aria-label="Close AI assistant"
          className="fixed inset-0 z-30 bg-background/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal={isOpen && isMobileDialog ? "true" : undefined}
        aria-labelledby={assistantTitleId}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : ""}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        className={cn(
          "ai-sidebar-panel fixed inset-x-2 z-40 flex max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[min(32rem,calc(100dvh-2rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface/95 p-4 text-copy-primary shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out md:absolute md:bottom-3 md:left-auto md:right-3 md:top-auto md:min-h-0 md:rounded-3xl md:p-5",
          isOpen
            ? "translate-y-0 md:translate-x-0"
            : "pointer-events-none translate-y-[calc(100%+1rem)] md:translate-x-[calc(100%+1rem)] md:translate-y-0"
        )}
        style={{
          bottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
      <header className="flex shrink-0 items-center gap-3 border-b border-surface-border pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-border bg-elevated text-brand">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={assistantTitleId} className="text-sm font-semibold text-copy-primary">
            Ask ArchPilot
          </h2>
          <p className="mt-0.5 text-[11px] text-copy-muted">
            Architecture assistant
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close AI sidebar"
          ref={closeButtonRef}
          onClick={onClose}
          className="-mr-2 h-11 w-11 text-copy-muted hover:bg-subtle hover:text-copy-primary"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3 shrink-0">
        <TabsList className="grid h-8 w-full grid-cols-2 rounded-full border border-surface-border bg-elevated p-1">
          <TabsTrigger
            value="architect"
            className="rounded-full text-xs text-copy-muted data-active:bg-accent-dim data-active:text-brand"
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="rounded-full text-xs text-copy-muted data-active:bg-accent-dim data-active:text-brand"
          >
            Specs
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "architect" ? (
          <AiArchitectTab
            draft={draft}
            isWorking={isWorking}
            messages={messages}
            workflow={workflow}
            onApplyProposal={onApplyProposal}
            onCheckStatusAgain={onCheckStatusAgain}
            onDraftChange={setDraft}
            onSubmitMessage={submitMessage}
          />
        ) : (
          <SpecsTab
            canvasControllerRef={canvasControllerRef}
            getToken={getToken}
            projectId={projectId}
            specWorkflow={specWorkflow}
            onDownloadSpec={downloadSpec}
            onGenerateSpec={generateSpec}
          />
        )}
      </div>
      </aside>
    </>
  )
}

export { AiSidebar }
