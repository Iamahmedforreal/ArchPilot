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

const sizes = {
  rectangle: { width: 180, height: 96 },
  diamond: { width: 160, height: 160 },
  circle: { width: 128, height: 128 },
  pill: { width: 180, height: 80 },
  cylinder: { width: 156, height: 116 },
  hexagon: { width: 164, height: 116 },
}

/**
 * @typedef {Object} CanvasTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {Array<Object>} nodes
 * @property {Array<Object>} edges
 */

function templateNode(id, label, shape, position, color = colors.neutral) {
  return {
    id,
    type: "canvasNode",
    position,
    data: {
      label,
      shape,
      color: color.background,
      textColor: color.text,
      size: sizes[shape],
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
      templateNode("client", "Client", "circle", { x: 0, y: 120 }, colors.external),
      templateNode("gateway", "API Gateway", "hexagon", { x: 220, y: 126 }, colors.brand),
      templateNode("auth", "Auth Service", "rectangle", { x: 460, y: 0 }, colors.ai),
      templateNode("orders", "Orders", "rectangle", { x: 460, y: 150 }, colors.neutral),
      templateNode("payments", "Payments", "rectangle", { x: 460, y: 300 }, colors.warning),
      templateNode("events", "Event Bus", "pill", { x: 710, y: 150 }, colors.success),
      templateNode("db", "PostgreSQL", "cylinder", { x: 710, y: 310 }, colors.external),
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
      templateNode("repo", "Repository", "cylinder", { x: 0, y: 115 }, colors.external),
      templateNode("ci", "CI Trigger", "pill", { x: 220, y: 130 }, colors.brand),
      templateNode("tests", "Tests", "diamond", { x: 460, y: 90 }, colors.warning),
      templateNode("build", "Build Image", "rectangle", { x: 720, y: 0 }, colors.neutral),
      templateNode("registry", "Registry", "cylinder", { x: 720, y: 170 }, colors.ai),
      templateNode("deploy", "Deploy", "hexagon", { x: 970, y: 115 }, colors.success),
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
      templateNode("producer", "Producer", "rectangle", { x: 0, y: 130 }, colors.brand),
      templateNode("broker", "Broker", "hexagon", { x: 250, y: 120 }, colors.success),
      templateNode("worker-a", "Worker A", "pill", { x: 500, y: 0 }, colors.neutral),
      templateNode("worker-b", "Worker B", "pill", { x: 500, y: 150 }, colors.neutral),
      templateNode("dead-letter", "DLQ", "diamond", { x: 500, y: 300 }, colors.warning),
      templateNode("store", "Data Store", "cylinder", { x: 760, y: 80 }, colors.external),
      templateNode("analytics", "Analytics", "circle", { x: 790, y: 270 }, colors.ai),
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
