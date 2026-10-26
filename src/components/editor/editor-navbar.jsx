import { UserButton } from "@clerk/react"
import {
  Check,
  CircleAlert,
  CloudUpload,
  LayoutTemplate,
  Layers3,
  PanelLeft,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navGroupClassName =
  "pointer-events-auto flex h-10 items-center rounded-xl border border-surface-border/80 bg-surface/80 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl"
const navButtonClassName =
  "h-8 w-8 rounded-lg p-0 text-copy-secondary hover:bg-accent-dim hover:text-brand"

function ProjectNavGroup({ isSidebarOpen, onToggleSidebar, projectName }) {
  return (
    <div className={cn(navGroupClassName, "min-w-0 max-w-full")}>
      <Button
        type="button"
        variant="ghost"
        aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
        aria-pressed={isSidebarOpen}
        onClick={onToggleSidebar}
        className={cn(
          navButtonClassName,
          isSidebarOpen && "bg-elevated text-copy-primary"
        )}
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      <span
        className="mx-1 hidden h-6 w-px bg-surface-border/80 sm:block"
        aria-hidden="true"
      />

      <div className="hidden min-w-0 items-center gap-2 px-2 sm:flex sm:px-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-dim text-brand">
          <Layers3 className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-none">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-copy-muted">
            Workspace
          </p>
          <p className="mt-1 max-w-[8rem] truncate text-sm font-semibold text-copy-primary sm:max-w-[13rem]">
            {projectName || "Untitled canvas"}
          </p>
        </div>
      </div>
    </div>
  )
}

function SaveStatusGroup({
  onSaveCanvas,
  onReloadCanvas,
  onOverwriteCanvas,
  saveStatus,
}) {
  const saveStatusDetails = {
    unsaved: { Icon: CircleAlert, label: "Unsaved", tone: "text-state-warning" },
    saving: { Icon: CloudUpload, label: "Saving", tone: "text-copy-muted" },
    saved: { Icon: Check, label: "Saved", tone: "text-state-success" },
    error: { Icon: CircleAlert, label: "Save failed", tone: "text-brand" },
    conflict: { Icon: CircleAlert, label: "Conflict", tone: "text-brand" },
  }
  const currentSaveStatus = saveStatusDetails[saveStatus]

  if (!onSaveCanvas && !currentSaveStatus) {
    return null
  }

  return (
    <div className={cn(navGroupClassName, "gap-0.5")}>
      {onSaveCanvas && saveStatus !== "conflict" && (
        <Button
          type="button"
          variant="ghost"
          aria-label="Save canvas"
          title="Save canvas"
          onClick={onSaveCanvas}
          className={navButtonClassName}
        >
          <Save className="h-4 w-4" />
        </Button>
      )}

      {saveStatus === "conflict" && onReloadCanvas && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reload server canvas"
          title="Reload server canvas"
          onClick={onReloadCanvas}
          className="h-8 w-8 rounded-lg text-copy-secondary hover:bg-subtle hover:text-brand"
        >
          <RefreshCw className="h-4 w-4" />
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
          className="h-8 w-8 rounded-lg text-copy-secondary hover:bg-subtle hover:text-brand"
        >
          <Save className="h-4 w-4" />
        </Button>
      )}

      {currentSaveStatus && (
        <span
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium sm:px-2.5",
            currentSaveStatus.tone
          )}
          aria-live="polite"
          title={currentSaveStatus.label}
        >
          <currentSaveStatus.Icon
            className={cn("h-3.5 w-3.5", saveStatus === "saving" && "animate-pulse")}
          />
          <span className="hidden sm:inline">{currentSaveStatus.label}</span>
        </span>
      )}
    </div>
  )
}

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
  return (
    <header
      className={cn(
        "pointer-events-none z-50 flex h-10 items-center justify-between gap-2 text-copy-primary",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ProjectNavGroup
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={onToggleSidebar}
          projectName={projectName}
        />
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
        {onOpenTemplates && (
          <div className={navGroupClassName}>
            <Button
              type="button"
              variant="ghost"
              aria-label="Open starter templates"
              title="Starter templates"
              onClick={onOpenTemplates}
              className={navButtonClassName}
            >
              <LayoutTemplate className="h-4 w-4" />
            </Button>
          </div>
        )}

        <SaveStatusGroup
          onSaveCanvas={onSaveCanvas}
          onReloadCanvas={onReloadCanvas}
          onOverwriteCanvas={onOverwriteCanvas}
          saveStatus={saveStatus}
        />

        {onToggleAiSidebar && (
          <div className={navGroupClassName}>
            <Button
              type="button"
              variant="ghost"
              aria-label={isAiSidebarOpen ? "Close AI chat" : "Open AI chat"}
              aria-pressed={isAiSidebarOpen}
              onClick={onToggleAiSidebar}
              className={cn(
                navButtonClassName,
                isAiSidebarOpen && "bg-accent-dim text-brand hover:bg-accent-dim"
              )}
            >
              <Sparkles className={cn("h-4 w-4", isAiSidebarOpen && "animate-pulse")} />
            </Button>
          </div>
        )}

        <div className="pointer-events-auto shrink-0">
          <UserButton />
        </div>
      </div>
    </header>
  )
}

export { EditorNavbar }
