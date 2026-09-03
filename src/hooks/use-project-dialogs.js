import { useMemo, useState } from "react"

const mockProjects = [
  {
    id: "personal-cloud",
    name: "Personal Cloud",
    slug: "personal-cloud",
    owned: true,
  },
  {
    id: "payments-platform",
    name: "Payments Platform",
    slug: "payments-platform",
    owned: true,
  },
  {
    id: "shared-observability",
    name: "Shared Observability",
    slug: "shared-observability",
    owned: false,
  },
]

function createSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function useProjectDialogs() {
  const [dialog, setDialog] = useState({ type: null, project: null })
  const [projectName, setProjectName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const slugPreview = useMemo(() => createSlug(projectName), [projectName])

  function openCreateDialog() {
    setProjectName("")
    setDialog({ type: "create", project: null })
  }

  function openRenameDialog(project) {
    setProjectName(project.name)
    setDialog({ type: "rename", project })
  }

  function openDeleteDialog(project) {
    setProjectName(project.name)
    setDialog({ type: "delete", project })
  }

  function closeDialog() {
    setDialog({ type: null, project: null })
    setProjectName("")
    setIsLoading(false)
  }

  function submitDialog() {
    setIsLoading(true)
    window.setTimeout(closeDialog, 200)
  }

  return {
    dialog,
    isLoading,
    mockProjects,
    projectName,
    setProjectName,
    slugPreview,
    closeDialog,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    submitDialog,
  }
}

export { useProjectDialogs }
