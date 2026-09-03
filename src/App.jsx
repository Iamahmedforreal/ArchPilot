import { useEffect, useState } from "react"
import { RedirectToSignIn, useAuth } from "@clerk/react"

import { AuthPage } from "@/components/auth/auth-page"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
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

  return (
    <main className="flex min-h-screen flex-col bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        onToggleSidebar={() => setIsProjectSidebarOpen((isOpen) => !isOpen)}
      />
      <ProjectSidebar
        isOpen={isProjectSidebarOpen}
        onClose={() => setIsProjectSidebarOpen(false)}
      />
      <section className="relative min-h-0 flex-1 overflow-hidden bg-dotted" />
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
