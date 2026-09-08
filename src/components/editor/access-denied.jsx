import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

function AccessDenied({ onBackToEditor }) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-dotted px-6 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface text-brand">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-copy-primary">
          Access denied
        </h1>
        <p className="mt-3 text-sm leading-6 text-copy-muted">
          This project does not exist, or you do not have access to it.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          asChild
        >
          <a
            href="/editor"
            onClick={(event) => {
              event.preventDefault()
              onBackToEditor()
            }}
          >
            Back to editor
          </a>
        </Button>
      </div>
    </section>
  )
}

export { AccessDenied }
