import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function ProjectDialogs({
  dialog,
  isLoading,
  projectName,
  setProjectName,
  slugPreview,
  closeDialog,
  submitDialog,
}) {
  const renameInputRef = useRef(null)
  const isOpen = Boolean(dialog.type)

  useEffect(() => {
    if (dialog.type === "rename") {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [dialog.type])

  function handleSubmit(event) {
    event.preventDefault()
    submitDialog()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="rounded-3xl border border-surface-border bg-elevated text-copy-primary shadow-2xl backdrop-blur-xl">
        {dialog.type === "create" && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-copy-primary">
                Create Project
              </DialogTitle>
              <DialogDescription className="text-copy-muted">
                Name a new architecture workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm text-copy-secondary">
                Project name
                <Input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="System design workspace"
                  className="text-copy-primary"
                />
              </label>
              <p className="font-mono text-xs text-copy-muted">
                Slug:{" "}
                <span className="text-brand">
                  {slugPreview || "project-slug"}
                </span>
              </p>
            </div>
            <DialogFooter className="mt-4 border-surface-border bg-surface/80">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !projectName.trim()}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        )}

        {dialog.type === "rename" && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-copy-primary">
                Rename Project
              </DialogTitle>
              <DialogDescription className="text-copy-muted">
                Current project: {dialog.project?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <label className="grid gap-2 text-sm text-copy-secondary">
                Project name
                <Input
                  ref={renameInputRef}
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className="text-copy-primary"
                />
              </label>
            </div>
            <DialogFooter className="mt-4 border-surface-border bg-surface/80">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !projectName.trim()}>
                Rename Project
              </Button>
            </DialogFooter>
          </form>
        )}

        {dialog.type === "delete" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-copy-primary">
                Delete Project
              </DialogTitle>
              <DialogDescription className="text-copy-muted">
                Delete {dialog.project?.name}? This confirmation has no input.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-surface-border bg-surface/80">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isLoading}
                onClick={submitDialog}
              >
                Delete Project
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { ProjectDialogs }
