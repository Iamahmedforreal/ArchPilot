import { useEffect, useRef, useState } from "react"
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
          "max-w-[82%] rounded-xl px-3 py-2 text-sm leading-5",
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

function AiArchitectTab() {
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState([])
  const textareaRef = useRef(null)

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [draft])

  function submitMessage(nextContent = draft) {
    const content = nextContent.trim()

    if (!content) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: crypto.randomUUID(), role: "user", content },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I can help shape that into a clear architecture. AI generation will connect here next.",
      },
    ])
    setDraft("")
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) {
      return
    }

    event.preventDefault()
    submitMessage()
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
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-xl border border-surface-border bg-elevated px-3 py-2 text-left text-xs font-medium leading-4 text-copy-secondary transition-colors hover:border-brand/60 hover:bg-accent-dim hover:text-brand"
                  onClick={() => submitMessage(prompt)}
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
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-30 min-h-11 resize-none rounded-xl border border-transparent bg-subtle px-3 py-2.5 text-sm text-copy-primary shadow-none placeholder:text-copy-muted focus-visible:border-brand/60 focus-visible:ring-1 focus-visible:ring-brand/30"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Send message"
            title="Send"
            onClick={submitMessage}
            disabled={!draft.trim()}
            className="h-10 w-10 shrink-0 rounded-xl bg-transparent text-copy-muted hover:bg-accent-dim hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
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
        className="h-10 w-full gap-2 bg-brand text-sm text-white hover:bg-brand-hover"
      >
        <Sparkles className="h-4 w-4" />
        Generate Spec
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

function AiSidebar({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("architect")

  return (
    <aside
      aria-hidden={!isOpen}
      inert={isOpen ? undefined : ""}
      className={cn(
        "absolute bottom-0 right-0 top-0 z-30 flex w-full flex-col border-l border-surface-border bg-base/95 p-4 text-copy-primary shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out sm:w-[23.75rem] sm:min-w-[21.25rem] sm:max-w-[25rem]",
        isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-surface-border pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-copy-primary">
            ArchPilot Assistant
          </h2>
          <p className="mt-0.5 text-[11px] text-copy-muted">
            Ready to help with your architecture
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close AI sidebar"
          onClick={onClose}
          className="-mr-2 text-copy-muted hover:bg-subtle hover:text-copy-primary"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3 shrink-0">
        <TabsList className="grid h-8 w-full grid-cols-2 rounded-xl border border-surface-border bg-elevated p-1">
          <TabsTrigger
            value="architect"
            className="rounded-lg text-xs text-copy-muted data-active:bg-accent-dim data-active:text-brand"
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="rounded-lg text-xs text-copy-muted data-active:bg-accent-dim data-active:text-brand"
          >
            Specs
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        {activeTab === "architect" ? <AiArchitectTab /> : <SpecsTab />}
      </div>
    </aside>
  )
}

export { AiSidebar }
