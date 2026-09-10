const TEMPLATE_EDGE_STYLE = {
  stroke: "var(--text-faint)",
  strokeWidth: 1.5,
}

const TEMPLATE_EDGE_MARKER = {
  type: "arrowclosed",
  color: "var(--text-faint)",
}

const colors = {
  neutral: {
    background: "var(--bg-subtle)",
    text: "var(--text-primary)",
  },
  brand: {
    background: "#3a1a14",
    text: "var(--accent-primary-hover)",
  },
  ai: {
    background: "#2a2140",
    text: "#b7a9ff",
  },
  warning: {
    background: "#332510",
    text: "var(--state-warning)",
  },
  success: {
    background: "#173524",
    text: "var(--state-success)",
  },
  external: {
    background: "#242424",
    text: "var(--text-primary)",
  },
}

const componentSizes = {
  client: { width: 160, height: 88 },
  api: { width: 160, height: 88 },
  service: { width: 176, height: 88 },
  database: { width: 160, height: 88 },
  queue: { width: 176, height: 88 },
  storage: { width: 176, height: 88 },
  worker: { width: 160, height: 88 },
  container: { width: 160, height: 88 },
  loadBalancer: { width: 176, height: 88 },
  authentication: { width: 176, height: 88 },
  externalService: { width: 176, height: 88 },
}

/**
 * @typedef {Object} CanvasTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {Array<Object>} nodes
 * @property {Array<Object>} edges
 */

function templateNode(
  id,
  label,
  componentType,
  iconKey,
  position,
  color = colors.neutral
) {
  return {
    id,
    type: "canvasNode",
    position,
    data: {
      label,
      componentType,
      iconKey,
      color: color.background,
      textColor: color.text,
      size: componentSizes[componentType] ?? componentSizes.service,
    },
  }
}

function templateEdge(id, source, target, sourceHandle = "right", targetHandle = "left") {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "smoothstep",
    animated: false,
    style: TEMPLATE_EDGE_STYLE,
    markerEnd: TEMPLATE_EDGE_MARKER,
  }
}

/** @type {CanvasTemplate[]} */
const CANVAS_TEMPLATES = [
  {
    id: "microservices",
    name: "Microservices",
    description: "API gateway, services, data stores, and an event bus.",
    nodes: [
      templateNode("client", "Client", "client", "client", { x: 0, y: 120 }, colors.external),
      templateNode("gateway", "API Gateway", "api", "api", { x: 220, y: 120 }, colors.brand),
      templateNode("auth", "Auth Service", "authentication", "authentication", { x: 460, y: 0 }, colors.ai),
      templateNode("orders", "Orders", "service", "server", { x: 460, y: 150 }, colors.neutral),
      templateNode("payments", "Payments", "service", "server", { x: 460, y: 300 }, colors.warning),
      templateNode("events", "Event Bus", "queue", "queue", { x: 720, y: 150 }, colors.success),
      templateNode("db", "PostgreSQL", "database", "database", { x: 720, y: 310 }, colors.external),
    ],
    edges: [
      templateEdge("client-gateway", "client", "gateway"),
      templateEdge("gateway-auth", "gateway", "auth", "right", "left"),
      templateEdge("gateway-orders", "gateway", "orders"),
      templateEdge("gateway-payments", "gateway", "payments", "right", "left"),
      templateEdge("orders-events", "orders", "events"),
      templateEdge("payments-events", "payments", "events", "right", "left"),
      templateEdge("orders-db", "orders", "db", "bottom", "left"),
    ],
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description: "Source control through validation, artifact build, and deploy.",
    nodes: [
      templateNode("repo", "Repository", "storage", "storage", { x: 0, y: 115 }, colors.external),
      templateNode("ci", "CI Trigger", "api", "api", { x: 230, y: 115 }, colors.brand),
      templateNode("tests", "Tests", "worker", "worker", { x: 470, y: 90 }, colors.warning),
      templateNode("build", "Build Image", "container", "container", { x: 720, y: 0 }, colors.neutral),
      templateNode("registry", "Registry", "storage", "storage", { x: 720, y: 170 }, colors.ai),
      templateNode("deploy", "Deploy", "loadBalancer", "loadBalancer", { x: 970, y: 115 }, colors.success),
    ],
    edges: [
      templateEdge("repo-ci", "repo", "ci"),
      templateEdge("ci-tests", "ci", "tests"),
      templateEdge("tests-build", "tests", "build", "right", "left"),
      templateEdge("build-registry", "build", "registry", "bottom", "top"),
      templateEdge("registry-deploy", "registry", "deploy"),
      templateEdge("tests-deploy", "tests", "deploy", "right", "left"),
    ],
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description: "Producers, broker topics, workers, storage, and analytics.",
    nodes: [
      templateNode("producer", "Producer", "service", "server", { x: 0, y: 130 }, colors.brand),
      templateNode("broker", "Broker", "queue", "queue", { x: 250, y: 120 }, colors.success),
      templateNode("worker-a", "Worker A", "worker", "worker", { x: 500, y: 0 }, colors.neutral),
      templateNode("worker-b", "Worker B", "worker", "worker", { x: 500, y: 150 }, colors.neutral),
      templateNode("dead-letter", "DLQ", "queue", "queue", { x: 500, y: 300 }, colors.warning),
      templateNode("store", "Data Store", "database", "database", { x: 760, y: 80 }, colors.external),
      templateNode("analytics", "Analytics", "service", "server", { x: 790, y: 270 }, colors.ai),
    ],
    edges: [
      templateEdge("producer-broker", "producer", "broker"),
      templateEdge("broker-worker-a", "broker", "worker-a", "right", "left"),
      templateEdge("broker-worker-b", "broker", "worker-b"),
      templateEdge("broker-dlq", "broker", "dead-letter", "right", "left"),
      templateEdge("worker-a-store", "worker-a", "store", "right", "left"),
      templateEdge("worker-b-store", "worker-b", "store"),
      templateEdge("worker-b-analytics", "worker-b", "analytics", "right", "left"),
    ],
  },
]

export { CANVAS_TEMPLATES }
