import { MoreHorizontal, PanelLeftClose, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

function ProjectSidebar({
  isOpen = false,
  onClose,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  projects = [],
  className,
}) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close project sidebar"
          className="fixed inset-0 top-14 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed left-0 top-14 bottom-0 z-40 flex w-80 max-w-[calc(100vw-1rem)] flex-col border-r border-surface-border bg-sidebar text-sidebar-foreground shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
          <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close project sidebar"
            onClick={onClose}
            className="text-copy-muted hover:bg-subtle hover:text-copy-primary"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="min-h-0 flex-1 gap-4 p-4">
          <TabsList className="grid w-full grid-cols-1 bg-elevated text-copy-muted">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          </TabsList>
          <TabsContent value="my-projects" className="min-h-0">
            <div className="grid gap-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-elevated/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-copy-primary">
                      {project.name}
                    </p>
                    <p className="truncate font-mono text-xs text-copy-muted">
                      /{project.slug}
                    </p>
                  </div>
                  {project.owned && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-surface-border p-4">
          <Button type="button" className="w-full gap-2" onClick={onCreateProject}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}

export { ProjectSidebar }
