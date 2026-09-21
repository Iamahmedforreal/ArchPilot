Replace the current generic shape icons with clean system-design component icons for the ArchPilot canvas.


## Icon library

Use the project’s existing icon library when possible. Otherwise, install and use:

```bash
npm install lucide-react
```

Do not use emojis, text symbols or raster images.

## Architecture components

Add these draggable components:

* Client — `Monitor`
* Mobile App — `Smartphone`
* Web App — `AppWindow`
* API — `Braces`
* Backend Service — `Server`
* Database — `Database`
* Cache — `Zap`
* Message Queue — `MessagesSquare`
* Object Storage — `HardDrive`
* Load Balancer — `Network`
* Worker — `Cog`
* Authentication — `ShieldCheck`
* External Service — `Cloud`
* Container — `Container`

Use the closest available Lucide icon if a named icon is unavailable.

## Component definitions

Create a JavaScript configuration array:

```jsx
export const architectureComponents = [
  {
    componentType: "database",
    iconKey: "database",
    label: "Database",
    width: 160,
    height: 88,
  },
  {
    componentType: "service",
    iconKey: "server",
    label: "Service",
    width: 160,
    height: 88,
  },
]
```

Do not put React components or functions inside the drag payload. The payload must contain only serializable values:

```js
{
  componentType: "database",
  iconKey: "database",
  defaultLabel: "Database",
  width: 160,
  height: 88
}
```

## Icon registry

Create a central JavaScript icon registry:

```jsx
import {
  AppWindow,
  Braces,
  Cloud,
  Cog,
  Container,
  Database,
  HardDrive,
  MessagesSquare,
  Monitor,
  Network,
  Server,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react"

export const architectureIcons = {
  client: Monitor,
  mobile: Smartphone,
  webApp: AppWindow,
  api: Braces,
  server: Server,
  database: Database,
  cache: Zap,
  queue: MessagesSquare,
  storage: HardDrive,
  loadBalancer: Network,
  worker: Cog,
  authentication: ShieldCheck,
  externalService: Cloud,
  container: Container,
}
```

Create a reusable component:

```jsx
export function ArchitectureIcon({ iconKey, ...props }) {
  const Icon = architectureIcons[iconKey] || Server
  return <Icon {...props} />
}
```

Invalid or missing icon keys must use a safe fallback and must not crash the canvas.

Keep the registry outside React components so it is not recreated during every render.

## Node data

New nodes should use this JavaScript object structure:

```js
{
  label: "Database",
  color: "default",
  componentType: "database",
  iconKey: "database"
}
```

If existing nodes use `shape`, preserve backward compatibility. Do not break or automatically rewrite saved nodes.

## Component palette

Update the current bottom toolbar to show system components instead of only geometric shapes.

Each draggable button should contain:

* architecture icon
* short label
* tooltip
* accessible label
* existing drag behavior

Keep the toolbar compact. If necessary, group components into:

* Clients
* Compute
* Data
* Messaging
* Infrastructure

Do not redesign the entire workspace.

## Node renderer

Update the existing custom canvas node renderer to show:

```text
┌─────────────────────┐
│ [icon]  Database    │
└─────────────────────┘
```

Each node should have:

* a 20–24px icon
* readable label
* dark background
* subtle border
* visible connection handles
* orange selected state
* consistent sizing

Preserve all existing movement, selection, connection and label-editing behavior.

## Backward compatibility

Existing geometric nodes must continue to render.

Use these fallbacks:

* Missing `componentType` → use `"service"`
* Missing or unknown `iconKey` → use the generic server icon
* Missing `label` → preserve the existing empty-label behavior
* Existing `shape` values → keep them supported

## Scope limits

Do not:

* add TypeScript
* add AI functionality
* modify the backend
* modify persistence or autosave
* add Liveblocks
* change edge behavior
* redesign the AI sidebar
* add branded AWS, Azure or Google Cloud icons
* refactor unrelated components

## Check when done

* All new files use `.js` or `.jsx`.
* No TypeScript syntax was introduced.
* The toolbar displays recognizable architecture components.
* Existing drag-and-drop behavior still works.
* Dropped nodes contain `componentType` and `iconKey`.
* Nodes display the correct icons and labels.
* Older nodes render safely.
* Existing canvas behavior remains unchanged.
* `npm run build` passes without errors.
