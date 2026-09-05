import { useEffect, useState } from "react"
import { RedirectToSignIn, useAuth } from "@clerk/react"
import { Plus } from "lucide-react"

import { AuthPage } from "@/components/auth/auth-page"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"
import {
  AFTER_SIGN_IN_URL,
  SIGN_IN_URL,
  isPublicAuthRoute,
  isSignInRoute,
  isSignUpRoute,
  normalizePath,
} from "@/lib/auth-routes"

function EditorShell() {
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(false)
  const pathname = normalizePath(window.location.pathname)
  const activeWorkspaceId = pathname.startsWith("/editor/")
    ? pathname.replace("/editor/", "")
    : null
  const projectActions = useProjectActions(activeWorkspaceId)

  return (
    <main className="flex min-h-screen flex-col bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        onToggleSidebar={() => setIsProjectSidebarOpen((isOpen) => !isOpen)}
      />
      <ProjectSidebar
        isOpen={isProjectSidebarOpen}
        onClose={() => setIsProjectSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={projectActions.openDeleteDialog}
        onRenameProject={projectActions.openRenameDialog}
        projects={projectActions.ownedProjects}
        sharedProjects={projectActions.sharedProjects}
      />
      <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-dotted px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-copy-primary">
            Create a project or open an existing one
          </h1>
          <p className="mt-3 text-sm leading-6 text-copy-muted">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>
          <Button
            type="button"
            className="mt-6 gap-2"
            onClick={projectActions.openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </section>
      <ProjectDialogs {...projectActions} />
    </main>
  )
}

function RedirectTo({ to }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return null
}

function App() {
  const { isLoaded, isSignedIn } = useAuth()
  const pathname = normalizePath(window.location.pathname)

  if (!isLoaded) {
    return <main className="min-h-screen bg-base" />
  }

  if (isSignInRoute(pathname)) {
    return isSignedIn ? <RedirectTo to={AFTER_SIGN_IN_URL} /> : <AuthPage mode="sign-in" />
  }

  if (isSignUpRoute(pathname)) {
    return isSignedIn ? <RedirectTo to={AFTER_SIGN_IN_URL} /> : <AuthPage mode="sign-up" />
  }

  if (pathname === "/") {
    return <RedirectTo to={isSignedIn ? AFTER_SIGN_IN_URL : SIGN_IN_URL} />
  }

  if (!isSignedIn && !isPublicAuthRoute(pathname)) {
    return <RedirectToSignIn />
  }

  return <EditorShell />
}

export default App
