import { useCallback, useEffect, useState } from "react"
import { RedirectToSignIn, useAuth } from "@clerk/react"
import { Plus } from "lucide-react"

import { AuthPage } from "@/components/auth/auth-page"
import { AccessDenied } from "@/components/editor/access-denied"
import { AiSidebar } from "@/components/editor/ai-sidebar"
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
import { fetchCanvas, fetchProject } from "@/lib/project-api"

function EditorShell({ pathname, navigate }) {
  const { getToken } = useAuth()
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const [currentProject, setCurrentProject] = useState(null)
  const [projectAccessState, setProjectAccessState] = useState("idle")
  const [projectRequestVersion, setProjectRequestVersion] = useState(0)
  const [canvasRequestVersion, setCanvasRequestVersion] = useState(0)
  const [canvasLoadState, setCanvasLoadState] = useState("idle")
  const [initialCanvas, setInitialCanvas] = useState(null)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [canvasSaveStatus, setCanvasSaveStatus] = useState("idle")
  const activeWorkspaceId = pathname.startsWith("/editor/")
    ? pathname.replace("/editor/", "")
    : null

  useEffect(() => {
    let isCurrentWorkspace = true

    queueMicrotask(() => {
      if (isCurrentWorkspace) {
        setCanvasSaveStatus("idle")
      }
    })

    return () => {
      isCurrentWorkspace = false
    }
  }, [activeWorkspaceId])

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
    setCanvasRequestVersion((version) => version + 1)
  }, [])
  const retryCanvasRequest = useCallback(() => {
    setCanvasRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let ignore = false
    const abortController = new AbortController()

    async function loadWorkspace() {
      if (!activeWorkspaceId) {
        setCurrentProject(null)
        setProjectAccessState("idle")
        setInitialCanvas(null)
        setCanvasLoadState("idle")
        return
      }

      setProjectAccessState("loading")
      setCanvasLoadState("loading")
      setInitialCanvas(null)
      setCanvasSaveStatus("idle")

      try {
        const timings = {
          startedAt: performance.now(),
        }
        const token = await getToken()
        if (ignore) {
          return
        }

        timings.tokenMs = performance.now() - timings.startedAt

        if (!token) {
          setCurrentProject(null)
          setProjectAccessState("denied")
          setCanvasLoadState("error")
          return
        }

        const projectStartedAt = performance.now()
        const projectRequest = fetchProject(token, activeWorkspaceId, {
          signal: abortController.signal,
        }).finally(() => {
          timings.projectMs = performance.now() - projectStartedAt
        })
        const canvasStartedAt = performance.now()
        const canvasRequest = fetchCanvas(token, activeWorkspaceId, {
          signal: abortController.signal,
        }).finally(() => {
          timings.canvasMs = performance.now() - canvasStartedAt
        })
        const [projectResult, canvasResult] = await Promise.allSettled([
          projectRequest,
          canvasRequest,
        ])

        if (ignore) {
          return
        }

        if (projectResult.status === "rejected") {
          throw projectResult.reason
        }

        const project = projectResult.value
        if (!project) {
          setCurrentProject(null)
          setProjectAccessState("denied")
          setCanvasLoadState("error")
          return
        }

        setCurrentProject(project)
        setProjectAccessState("ready")

        if (canvasResult.status === "rejected") {
          console.error(canvasResult.reason)
          setCanvasLoadState("error")
          console.info("Canvas entry load timings", {
            projectId: activeWorkspaceId,
            tokenMs: Math.round(timings.tokenMs),
            projectMs: Math.round(timings.projectMs ?? 0),
            canvasMs: Math.round(timings.canvasMs ?? 0),
            result: "canvas-error",
          })
          return
        }

        const loadedCanvas = canvasResult.value
        setInitialCanvas(
          loadedCanvas
            ? {
                nodes: loadedCanvas.nodes ?? [],
                edges: loadedCanvas.edges ?? [],
                viewport: loadedCanvas.viewport,
                revision: loadedCanvas.revision ?? null,
              }
            : {
                nodes: [],
                edges: [],
                revision: null,
              }
        )
        setCanvasLoadState("ready")
        console.info("Canvas entry load timings", {
          projectId: activeWorkspaceId,
          tokenMs: Math.round(timings.tokenMs),
          projectMs: Math.round(timings.projectMs ?? 0),
          canvasMs: Math.round(timings.canvasMs ?? 0),
          payloadBytes: loadedCanvas
            ? new Blob([JSON.stringify(loadedCanvas)]).size
            : 0,
          result: loadedCanvas ? "snapshot" : "empty",
        })
      } catch (error) {
        if (error.name === "AbortError") {
          return
        }

        console.error(error)
        if (!ignore) {
          setCurrentProject(null)
          setProjectAccessState("error")
          setCanvasLoadState("error")
        }
      }
    }

    loadWorkspace()

    return () => {
      ignore = true
      abortController.abort()
    }
  }, [activeWorkspaceId, canvasRequestVersion, getToken, projectRequestVersion])

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
        <EditorCanvas
          key={activeWorkspaceId}
          isTemplatesModalOpen={isTemplatesModalOpen}
          onTemplatesModalOpenChange={setIsTemplatesModalOpen}
          projectId={activeWorkspaceId}
          getToken={getToken}
          canvasLoadState={canvasLoadState}
          canvasLoadKey={`${activeWorkspaceId}:${canvasRequestVersion}`}
          initialCanvas={initialCanvas}
          onCanvasRetry={retryCanvasRequest}
          onSaveStatusChange={setCanvasSaveStatus}
        />
        <AiSidebar
          isOpen={isAiSidebarOpen}
          onClose={() => setIsAiSidebarOpen(false)}
        />
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
        onOpenTemplates={
          activeWorkspaceId ? () => setIsTemplatesModalOpen(true) : undefined
        }
        projectName={activeProject?.name}
        saveStatus={canvasSaveStatus}
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
