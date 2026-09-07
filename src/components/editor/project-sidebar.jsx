import { useMemo, useRef, useState } from "react"
import { MoreHorizontal, PanelLeft, Plus, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function ProjectSidebar({
  isOpen = false,
  onClose,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  activeProjectId,
  projects = [],
  className,
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef(null)
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredProjects = useMemo(() => {
    if (!normalizedSearchQuery) {
      return projects
    }

    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedSearchQuery)
    )
  }, [normalizedSearchQuery, projects])

  function renderProject(project) {
    const isActive =
      activeProjectId === project.roomId || activeProjectId === project.id

    return (
      <div
        key={project.id}
        className={cn(
          "group flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-left transition-colors",
          isActive
            ? "bg-subtle text-copy-primary"
            : "text-copy-secondary hover:bg-elevated hover:text-copy-primary"
        )}
      >
        <button
          type="button"
          className="min-w-0 flex-1 truncate py-2.5 text-left text-[15px] font-medium leading-5"
          onClick={onClose}
        >
          {project.name}
        </button>
        {project.owned && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Rename ${project.name}`}
              onClick={() => onRenameProject(project)}
              className="text-copy-muted hover:bg-subtle hover:text-copy-primary"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${project.name}`}
              onClick={() => onDeleteProject(project)}
              className="text-copy-muted hover:bg-subtle hover:text-state-error"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close project sidebar"
          className="fixed inset-0 z-30 bg-background/60 md:top-14 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : ""}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex w-84 max-w-[calc(100vw-0.75rem)] flex-col border-r border-surface-border bg-base text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-out md:top-14",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-3">
          <h2 className="text-xl font-semibold tracking-tight text-copy-primary">
            ArchPilot
          </h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Search projects"
              onClick={() => searchInputRef.current?.focus()}
              className="text-copy-muted hover:bg-subtle hover:text-copy-primary"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New project"
              onClick={onCreateProject}
              className="text-copy-muted hover:bg-subtle hover:text-copy-primary"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-2 pb-3">
          <div className="relative mb-3 px-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-copy-muted" />
            <Input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects"
              className="h-10 rounded-xl border-surface-border bg-surface pl-9 pr-3 text-copy-primary placeholder:text-copy-muted focus-visible:border-brand focus-visible:ring-brand/20"
            />
          </div>

          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-copy-muted">Recent Projects</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close project sidebar"
              onClick={onClose}
              className="text-copy-muted hover:bg-subtle hover:text-copy-primary md:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-1">
              {filteredProjects.map(renderProject)}
            </div>
            {filteredProjects.length === 0 && (
              <p className="px-3 py-6 text-sm text-copy-muted">
                No projects found.
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 p-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-2 rounded-xl px-3 text-copy-secondary hover:bg-elevated hover:text-copy-primary"
            onClick={onCreateProject}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}

export { ProjectSidebar }
