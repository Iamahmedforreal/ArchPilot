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

const architectureIcons = {
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

export { architectureIcons, Server as fallbackArchitectureIcon }
