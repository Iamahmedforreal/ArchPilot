import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

function App() {
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
      <section className="relative min-h-0 flex-1 bg-base" />
    </main>
  )
}

export default App
