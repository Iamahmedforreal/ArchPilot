import { UserButton } from "@clerk/react"
import { LayoutTemplate, PanelLeft, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function EditorNavbar({
  isSidebarOpen = false,
  isAiSidebarOpen = false,
  onToggleSidebar,
  onToggleAiSidebar,
  onOpenTemplates,
  projectName = null,
  className,
}) {
  return (
    <header
      className={cn(
        "relative flex h-14 shrink-0 items-center border-b border-surface-border/70 bg-canvas bg-dotted px-3 text-copy-primary",
        className
      )}
    >
      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-start">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          aria-pressed={isSidebarOpen}
          onClick={onToggleSidebar}
          className="text-copy-secondary hover:bg-subtle hover:text-copy-primary"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-x-16 top-1/2 flex -translate-y-1/2 items-center justify-center px-3">
        {projectName && (
          <p className="truncate text-sm font-semibold text-copy-primary">
            {projectName}
          </p>
        )}
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-end gap-1">
        {onOpenTemplates && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open starter templates"
            title="Starter templates"
            onClick={onOpenTemplates}
            className="text-copy-secondary hover:bg-subtle hover:text-brand"
          >
            <LayoutTemplate className="h-5 w-5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
          aria-pressed={isAiSidebarOpen}
          onClick={onToggleAiSidebar}
          className="text-copy-secondary hover:bg-subtle hover:text-brand"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
        <UserButton />
      </div>
    </header>
  )
}

export { EditorNavbar }
