import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const editorDialogContentClassName =
  "rounded-3xl border border-surface-border bg-elevated text-copy-primary shadow-2xl backdrop-blur-xl"

function EditorDialogPattern({
  title,
  description,
  footer,
  children,
  className,
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      <DialogHeader>
        {title && <DialogTitle className="text-copy-primary">{title}</DialogTitle>}
        {description && (
          <DialogDescription className="text-copy-muted">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>
      {children}
      {footer && (
        <DialogFooter className="border-surface-border bg-surface/80">
          {footer}
        </DialogFooter>
      )}
    </div>
  )
}

export { EditorDialogPattern, editorDialogContentClassName }
