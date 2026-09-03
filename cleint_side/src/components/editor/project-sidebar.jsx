import { PanelLeftClose, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

function EmptyProjectState({ label }) {
  return (
    <div className="flex min-h-48 flex-1 items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-elevated/60 px-6 text-center">
      <p className="text-sm text-copy-muted">{label}</p>
    </div>
  )
}

function ProjectSidebar({ isOpen = false, onClose, className }) {
  return (
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
        <TabsContent value="my-projects" className="flex min-h-0">
          <EmptyProjectState label="No projects yet." />
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-surface-border p-4">
        <Button type="button" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}

export { ProjectSidebar }
