import { UserButton } from "@clerk/react"
import { PanelLeft, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function EditorNavbar({
  isSidebarOpen = false,
  isAiSidebarOpen = false,
  onToggleSidebar,
  onToggleAiSidebar,
  projectName = null,
  className,
}) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3 text-copy-primary",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-start">
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

      <div className="flex min-w-0 flex-1 items-center justify-center px-3">
        {projectName && (
          <p className="truncate text-sm font-semibold text-copy-primary">
            {projectName}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
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
