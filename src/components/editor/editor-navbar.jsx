import { UserButton } from "@clerk/react"
import {
  Check,
  CircleAlert,
  CloudUpload,
  LayoutTemplate,
  PanelLeft,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function EditorNavbar({
  isSidebarOpen = false,
  isAiSidebarOpen = false,
  onToggleSidebar,
  onToggleAiSidebar,
  onOpenTemplates,
  onSaveCanvas,
  onReloadCanvas,
  onOverwriteCanvas,
  projectName = null,
  saveStatus = "idle",
  className,
}) {
  const saveStatusDetails = {
    unsaved: { Icon: CircleAlert, label: "Unsaved changes" },
    saving: { Icon: CloudUpload, label: "Saving canvas" },
    saved: { Icon: Check, label: "Canvas saved" },
    error: { Icon: CircleAlert, label: "Canvas save failed" },
    conflict: { Icon: CircleAlert, label: "Canvas revision conflict" },
  }
  const currentSaveStatus = saveStatusDetails[saveStatus]

  return (
    <header
      className={cn(
        "relative flex h-12 shrink-0 items-center border-b border-surface-border/60 bg-canvas bg-dotted px-3 text-copy-primary",
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
          className="h-9 w-9 rounded-xl text-copy-secondary hover:bg-subtle hover:text-copy-primary"
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
        {currentSaveStatus && (
          <span
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-xl px-2 text-xs font-medium",
              saveStatus === "error" || saveStatus === "conflict"
                ? "text-brand"
                : "text-copy-muted"
            )}
            aria-live="polite"
            title={currentSaveStatus.label}
          >
            <currentSaveStatus.Icon
              className={cn("h-4 w-4", saveStatus === "saving" && "animate-pulse")}
            />
            <span className="hidden lg:inline">{currentSaveStatus.label}</span>
          </span>
        )}
        {saveStatus === "conflict" && onReloadCanvas && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Reload server canvas"
            title="Reload server canvas"
            onClick={onReloadCanvas}
            className="h-9 w-9 rounded-xl text-copy-secondary hover:bg-subtle hover:text-brand"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        )}
        {saveStatus === "conflict" && onOverwriteCanvas && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Overwrite server canvas"
            title="Overwrite server canvas with local work"
            onClick={onOverwriteCanvas}
            className="h-9 w-9 rounded-xl text-copy-secondary hover:bg-subtle hover:text-brand"
          >
            <Save className="h-5 w-5" />
          </Button>
        )}
        {onSaveCanvas && saveStatus !== "conflict" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Save canvas"
            title="Save canvas"
            onClick={onSaveCanvas}
            className="h-9 w-9 rounded-xl text-copy-secondary hover:bg-subtle hover:text-brand"
          >
            <Save className="h-5 w-5" />
          </Button>
        )}
        {onOpenTemplates && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open starter templates"
            title="Starter templates"
            onClick={onOpenTemplates}
            className="h-9 w-9 rounded-xl text-copy-secondary hover:bg-subtle hover:text-brand"
          >
            <LayoutTemplate className="h-5 w-5" />
          </Button>
        )}
        {onToggleAiSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            aria-pressed={isAiSidebarOpen}
            onClick={onToggleAiSidebar}
            className="hidden h-9 w-9 rounded-xl text-copy-secondary hover:bg-subtle hover:text-brand md:inline-flex"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        )}
        <UserButton />
      </div>
    </header>
  )
}

export { EditorNavbar }
