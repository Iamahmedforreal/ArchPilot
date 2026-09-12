import {
  architectureIcons,
  fallbackArchitectureIcon,
} from "@/components/editor/architecture-icon-registry"

function ArchitectureIcon({ iconKey, ...props }) {
  const Icon = architectureIcons[iconKey] || fallbackArchitectureIcon

  return <Icon {...props} />
}

export { ArchitectureIcon }
