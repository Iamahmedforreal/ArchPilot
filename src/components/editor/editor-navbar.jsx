import { UserButton } from "@clerk/react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function EditorNavbar({
  isSidebarOpen = false,
  onToggleSidebar,
  centerContent = null,
  className,
}) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen

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
          <SidebarIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {centerContent}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end">
        <UserButton />
      </div>
    </header>
  )
}

export { EditorNavbar }
