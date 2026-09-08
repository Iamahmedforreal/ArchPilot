import { useCallback, useEffect, useState } from "react"
import { RedirectToSignIn, useAuth } from "@clerk/react"
import { Plus, Sparkles } from "lucide-react"

import { AuthPage } from "@/components/auth/auth-page"
import { AccessDenied } from "@/components/editor/access-denied"
import { EditorCanvas } from "@/components/editor/editor-canvas"
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
import { fetchProject } from "@/lib/project-api"

function EditorShell({ pathname, navigate }) {
  const { getToken } = useAuth()
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const [currentProject, setCurrentProject] = useState(null)
  const [projectAccessState, setProjectAccessState] = useState("idle")
  const [projectRequestVersion, setProjectRequestVersion] = useState(0)
  const activeWorkspaceId = pathname.startsWith("/editor/")
    ? pathname.replace("/editor/", "")
    : null
  const projectActions = useProjectActions(activeWorkspaceId, navigate)
  const activeProject =
    projectActions.ownedProjects.find(
      (project) =>
        project.roomId === activeWorkspaceId || project.id === activeWorkspaceId
    ) ?? currentProject
  const handleSelectProject = useCallback(
    (project) => {
      navigate(`/editor/${project.roomId}`)
      setIsProjectSidebarOpen(false)
    },
    [navigate]
  )
  const retryProjectRequest = useCallback(() => {
    setProjectRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadProject() {
      if (!activeWorkspaceId) {
        setCurrentProject(null)
        setProjectAccessState("idle")
        return
      }

      setProjectAccessState("loading")

      try {
        const token = await getToken()
        if (!token) {
          setCurrentProject(null)
          setProjectAccessState("denied")
          return
        }

        const project = await fetchProject(token, activeWorkspaceId)
        if (ignore) {
          return
        }

        if (!project) {
          setCurrentProject(null)
          setProjectAccessState("denied")
          return
        }

        setCurrentProject(project)
        setProjectAccessState("ready")
      } catch (error) {
        console.error(error)
        if (!ignore) {
          setCurrentProject(null)
          setProjectAccessState("error")
        }
      }
    }

    loadProject()

    return () => {
      ignore = true
    }
  }, [activeWorkspaceId, getToken, projectRequestVersion])

  function renderWorkspaceContent() {
    if (!activeWorkspaceId) {
      return (
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
      )
    }

    if (projectAccessState === "loading") {
      return (
        <section className="flex min-h-0 flex-1 items-center justify-center bg-dotted px-6 text-sm text-copy-muted">
          Loading workspace...
        </section>
      )
    }

    if (projectAccessState === "denied") {
      return <AccessDenied onBackToEditor={() => navigate("/editor")} />
    }

    if (projectAccessState === "error") {
      return (
        <section className="flex min-h-0 flex-1 items-center justify-center bg-dotted px-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-copy-primary">
              Could not load workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-copy-muted">
              The project request failed. Check the backend connection and try again.
            </p>
            <Button
              type="button"
              className="mt-6"
              onClick={retryProjectRequest}
            >
              Retry
            </Button>
          </div>
        </section>
      )
    }

    return (
      <section className="relative flex min-h-0 flex-1 overflow-hidden bg-base">
        <EditorCanvas />
        {isAiSidebarOpen && (
          <aside className="absolute right-0 top-0 bottom-0 z-20 hidden w-80 border-l border-surface-border bg-surface p-4 text-copy-primary shadow-2xl lg:flex lg:flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-brand" />
              AI sidebar
            </div>
            <div className="mt-6 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-surface-border bg-base px-5 text-center text-sm leading-6 text-copy-muted">
              Future AI chat will live here.
            </div>
          </aside>
        )}
      </section>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleSidebar={() => setIsProjectSidebarOpen((isOpen) => !isOpen)}
        onToggleAiSidebar={() => setIsAiSidebarOpen((isOpen) => !isOpen)}
        projectName={activeProject?.name}
      />
      <ProjectSidebar
        isOpen={isProjectSidebarOpen}
        onClose={() => setIsProjectSidebarOpen(false)}
        onCreateProject={projectActions.openCreateDialog}
        onDeleteProject={projectActions.openDeleteDialog}
        onRenameProject={projectActions.openRenameDialog}
        onSelectProject={handleSelectProject}
        activeProjectId={activeWorkspaceId}
        projects={projectActions.ownedProjects}
      />
      {renderWorkspaceContent()}
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
  const [pathname, setPathname] = useState(() =>
    normalizePath(window.location.pathname)
  )
  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to)
    setPathname(normalizePath(window.location.pathname))
  }, [])

  useEffect(() => {
    function handlePopState() {
      setPathname(normalizePath(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

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

  return <EditorShell pathname={pathname} navigate={navigate} />
}

export default App
