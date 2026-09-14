import { useEffect, useEffectEvent, useId, useRef, useState } from "react"
import { Download, FileText, Send, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

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

function AiArchitectTab({
  draft,
  isWorking,
  messages,
  onDraftChange,
  onSubmitMessage,
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [draft])

  function handleKeyDown(event) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      !window.matchMedia("(min-width: 768px)").matches
    ) {
      return
    }

    event.preventDefault()
    onSubmitMessage()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
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
          </div>
        )}
      </div>

      <div className="mt-3 shrink-0 border-t border-surface-border pt-3">
        <p className="mb-2 text-[11px] leading-4 text-copy-muted">
          AI can make mistakes, so double-check important details.
        </p>
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            placeholder="Ask a question..."
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-28 min-h-11 resize-none rounded-xl border border-transparent bg-subtle px-3 py-2 text-sm text-copy-primary shadow-none placeholder:text-copy-muted focus-visible:border-brand/60 focus-visible:ring-1 focus-visible:ring-brand/30"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Send message"
            title="Send"
            onClick={() => onSubmitMessage()}
            disabled={!draft.trim() || isWorking}
            className="h-11 w-11 shrink-0 rounded-xl bg-transparent text-copy-muted hover:bg-accent-dim hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SpecsTab() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 pt-1">
      <Button
        type="button"
        disabled
        aria-label="Generate spec unavailable"
        className="h-9 w-full gap-2 rounded-xl bg-brand text-sm text-white hover:bg-brand-hover"
      >
        <Sparkles className="h-4 w-4" />
        Generate Spec Unavailable
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
              Draft system overview, components, data flow, and open implementation risks.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled
          className="mt-3 h-9 w-full gap-2 border-surface-border bg-transparent text-xs text-copy-muted"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </article>
    </div>
  )
}

function AiSidebar({ isOpen, onClose, onOpen }) {
  const [activeTab, setActiveTab] = useState("architect")
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState([])
  const [isWorking, setIsWorking] = useState(false)
  const assistantTitleId = useId()
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const responseTimeoutRef = useRef(null)
  const closeAssistant = useEffectEvent(onClose)

  useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) {
        window.clearTimeout(responseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen])

  function submitMessage(nextContent = draft) {
    const content = nextContent.trim()

    if (!content || isWorking) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: crypto.randomUUID(), role: "user", content },
    ])
    setDraft("")
    setIsWorking(true)

    responseTimeoutRef.current = window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I can help shape that into a clear architecture. AI generation will connect here next.",
        },
      ])
      setIsWorking(false)
      responseTimeoutRef.current = null
    }, 500)
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
        aria-modal={isOpen ? "true" : undefined}
        aria-labelledby={assistantTitleId}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : ""}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        className={cn(
          "fixed inset-x-2 z-40 flex max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[min(32rem,calc(100dvh-2rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 p-3 text-copy-primary shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out md:absolute md:bottom-3 md:left-auto md:right-3 md:top-3 md:max-h-none md:min-h-0 md:w-[360px] md:rounded-[1.4rem] md:p-3.5",
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
            onDraftChange={setDraft}
            onSubmitMessage={submitMessage}
          />
        ) : (
          <SpecsTab />
        )}
      </div>
      </aside>
    </>
  )
}

export { AiSidebar }
