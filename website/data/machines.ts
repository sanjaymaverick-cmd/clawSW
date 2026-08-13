/**
 * Machine catalog for immersive 3D systems (Explorer, Workbench, Floor Planner).
 * Seeded from Sanjay Wood Tech product lines. GLBs optional — placeholders work fully.
 */

export type MachinePartId =
  | "base"
  | "frame"
  | "table"
  | "fence"
  | "blade"
  | "motor"
  | "hood"
  | "control"
  | "feed"
  | "column";

export type MachinePart = {
  id: MachinePartId;
  name: string;
  description: string;
  /** World offset applied at explodeProgress = 1 */
  explodeOffset: [number, number, number];
  relatedSpares?: string[];
};

export type Machine = {
  id: string;
  slug: string;
  name: string;
  model: string | null;
  category: string;
  categorySlug: string;
  description: string;
  image: string | null;
  /** Optional GLB under /public — SafeMachineModel falls back if missing */
  glbUrl: string | null;
  /** Real catalogue product slug for "Specs & enquiry" when it differs from `slug` */
  productSlug?: string;
  /** Footprint in metres (for floor planner) */
  dimensions: { width: number; depth: number; height: number };
  /** Service clearance in metres */
  clearance: number;
  /** Accent color for placeholder / planner */
  color: string;
  parts: MachinePart[];
  features: string[];
};

/** @deprecated alias for Phase docs that used MachineDef */
export type MachineDef = Machine;
export type MachinePartDef = MachinePart;

const SAW_PARTS: MachinePart[] = [
  {
    id: "base",
    name: "Machine base",
    description: "Heavy steel frame anchoring the saw for vibration-free cuts.",
    explodeOffset: [0, -0.35, 0],
    relatedSpares: ["leveling-feet", "anchor-kit"],
  },
  {
    id: "frame",
    name: "Main frame",
    description: "Welded structure supporting table and carriage.",
    explodeOffset: [0, 0.15, -0.25],
  },
  {
    id: "table",
    name: "Work table",
    description: "Precision cast / ground surface for panel support.",
    explodeOffset: [0, 0.1, 0.45],
    relatedSpares: ["table-insert", "wear-strip"],
  },
  {
    id: "fence",
    name: "Rip fence",
    description: "Guided fence for parallel cutting accuracy.",
    explodeOffset: [-0.55, 0.2, 0],
    relatedSpares: ["fence-lock", "scale-tape"],
  },
  {
    id: "blade",
    name: "Cutting unit",
    description: "Main + scoring saw assembly with motor drive.",
    explodeOffset: [0.35, 0.45, 0.2],
    relatedSpares: ["main-blade", "scoring-blade", "belts"],
  },
  {
    id: "motor",
    name: "Drive motor",
    description: "High-torque motor for continuous production cycles.",
    explodeOffset: [0.5, -0.1, -0.4],
    relatedSpares: ["motor-brushes", "contactor"],
  },
  {
    id: "hood",
    name: "Dust hood",
    description: "Extraction hood for cleaner shop air.",
    explodeOffset: [0.1, 0.55, 0.15],
    relatedSpares: ["hood-seal", "hose-clamp"],
  },
  {
    id: "control",
    name: "Control panel",
    description: "Operator HMI for programs, diagnostics, and safety.",
    explodeOffset: [-0.45, 0.4, 0.35],
  },
];

const NESTING_PARTS: MachinePart[] = [
  {
    id: "base",
    name: "Base frame",
    description: "Rigid base for vacuum table and gantry.",
    explodeOffset: [0, -0.3, 0],
  },
  {
    id: "table",
    name: "Vacuum table",
    description: "Zoned vacuum hold-down for nesting panels.",
    explodeOffset: [0, 0.05, 0.4],
    relatedSpares: ["vacuum-gasket", "table-mat"],
  },
  {
    id: "column",
    name: "Gantry",
    description: "X/Y bridge carrying the spindle head.",
    explodeOffset: [0, 0.5, -0.3],
  },
  {
    id: "blade",
    name: "Spindle head",
    description: "High-speed spindle with tool changer options.",
    explodeOffset: [0.3, 0.55, 0.1],
    relatedSpares: ["collet", "spindle-bearings"],
  },
  {
    id: "motor",
    name: "Servo drives",
    description: "Axis motors for precise toolpath following.",
    explodeOffset: [-0.45, 0.2, -0.35],
  },
  {
    id: "control",
    name: "CNC controller",
    description: "Nesting CAM/CNC control with touch interface.",
    explodeOffset: [-0.5, 0.45, 0.4],
  },
  {
    id: "hood",
    name: "Dust extraction",
    description: "Spindle-mounted extraction boot.",
    explodeOffset: [0.15, 0.6, 0.2],
  },
];

const EDGE_PARTS: MachinePart[] = [
  {
    id: "base",
    name: "Base",
    description: "Long-bed frame for continuous edge feed.",
    explodeOffset: [0, -0.3, 0],
  },
  {
    id: "feed",
    name: "Feed track",
    description: "Belt / chain feed for panel transport.",
    explodeOffset: [0, 0.15, 0.5],
    relatedSpares: ["feed-belt", "pressure-pads"],
  },
  {
    id: "frame",
    name: "Station frame",
    description: "Supports gluing, trimming, and scraping units.",
    explodeOffset: [0, 0.2, -0.2],
  },
  {
    id: "blade",
    name: "Trimming unit",
    description: "End-trim and fine-trim tooling for clean edges.",
    explodeOffset: [0.4, 0.35, 0],
    relatedSpares: ["trim-knives", "scrapers"],
  },
  {
    id: "motor",
    name: "Glue pot motor",
    description: "Hot-melt glue application system.",
    explodeOffset: [-0.35, 0.25, -0.3],
    relatedSpares: ["glue-pot", "heater-element"],
  },
  {
    id: "control",
    name: "Control panel",
    description: "Program edge thickness, speed, and stations.",
    explodeOffset: [-0.55, 0.4, 0.35],
  },
  {
    id: "hood",
    name: "Extraction hoods",
    description: "Dust and chip collection at trim stations.",
    explodeOffset: [0.1, 0.55, 0.1],
  },
];

function m(
  partial: Omit<Machine, "parts" | "features" | "image" | "glbUrl" | "model"> &
    Partial<Pick<Machine, "parts" | "features" | "image" | "glbUrl" | "model">>
): Machine {
  return {
    model: null,
    image: null,
    glbUrl: null,
    features: [],
    parts: SAW_PARTS,
    ...partial,
  };
}

export const machines: Machine[] = [
  m({
    id: "beam-saw-bs-2700",
    slug: "beam-saw-bs-2700",
    name: "Beam Saw BS-2700",
    model: "BS-2700",
    category: "Beam Saw",
    categorySlug: "panel-processing-machinery",
    description:
      "High-performance CNC panel saw for fast, accurate cutting of MDF, plywood, and laminates.",
    dimensions: { width: 5.2, depth: 4.2, height: 1.8 },
    clearance: 0.9,
    color: "#e0a45a",
    // No product-specific mesh yet — use honest placeholder geometry rather
    // than dressing a generic saw-blade GLB up as this machine.
    glbUrl: null,
    parts: SAW_PARTS,
    features: ["2700 mm capacity", "Main + scoring blades", "Touchscreen CNC"],
  }),
  m({
    id: "beam-saw-bs-3300",
    slug: "beam-saw-bs-3300",
    name: "Beam Saw BS-3300",
    model: "BS-3300",
    category: "Beam Saw",
    categorySlug: "panel-processing-machinery",
    description: "Fully automated CNC panel saw for large-format panels.",
    dimensions: { width: 5.8, depth: 4.5, height: 1.85 },
    clearance: 1.0,
    color: "#c77d2e",
    parts: SAW_PARTS,
  }),
  m({
    id: "cnc-nesting-machine-si-2409b",
    slug: "cnc-nesting-machine-si-2409b",
    name: "CNC Nesting Machine SI-2409B",
    model: "SI-2409B",
    category: "CNC Nesting",
    categorySlug: "panel-processing-machinery",
    description:
      "Nesting CNC for panel furniture with vacuum hold-down and optimized toolpaths.",
    dimensions: { width: 3.6, depth: 2.2, height: 2.1 },
    clearance: 0.85,
    color: "#8ab4c4",
    parts: NESTING_PARTS,
  }),
  m({
    id: "edge-banding-machine-fzb505",
    slug: "edge-banding-machine-fzb505",
    name: "Edge Banding Machine FZB505",
    model: "FZB505",
    category: "Edge Banding",
    categorySlug: "panel-processing-machinery",
    description: "Automatic edge bander for PVC, ABS, and wood veneer edges.",
    dimensions: { width: 4.2, depth: 0.9, height: 1.5 },
    clearance: 0.75,
    color: "#d4a574",
    parts: EDGE_PARTS,
  }),
  m({
    id: "cnc-router-cnc-1325",
    slug: "cnc-router-cnc-1325",
    name: "CNC Router CNC-1325",
    model: "CNC-1325",
    category: "CNC Router",
    categorySlug: "panel-processing-machinery",
    description: "Versatile CNC router for solid wood and panel machining.",
    dimensions: { width: 3.0, depth: 2.0, height: 1.9 },
    clearance: 0.8,
    color: "#9aa3ad",
    parts: NESTING_PARTS,
  }),
  m({
    id: "cnc-double-end-tenoner-model-cnc-dt-250",
    slug: "cnc-double-end-tenoner-model-cnc-dt-250",
    name: "CNC Double End Tenoner",
    model: "CNC-DT-250",
    category: "CNC Tenoner",
    categorySlug: "solid-wood-machinery",
    description: "CNC double-end tenoner for high-accuracy joinery.",
    dimensions: { width: 4.0, depth: 1.6, height: 1.75 },
    clearance: 0.85,
    color: "#b8926a",
    parts: SAW_PARTS,
  }),
  m({
    id: "automatic-finger-jointing-model-sip-3820",
    slug: "automatic-finger-jointing-model-sip-3820",
    name: "Automatic Finger Jointing SIP-3820",
    model: "SIP-3820",
    category: "Finger Jointing",
    categorySlug: "solid-woodworking-machinery-taiwan",
    description: "Automated finger jointing line for solid wood recovery.",
    dimensions: { width: 8.0, depth: 1.8, height: 1.9 },
    clearance: 1.1,
    color: "#c49a6c",
    parts: EDGE_PARTS,
  }),
  m({
    id: "cnc-mortiser-model-cnc-m250",
    slug: "cnc-mortiser-model-cnc-m250",
    name: "CNC Mortiser CNC-M250",
    model: "CNC-M250",
    category: "CNC Mortiser",
    categorySlug: "solid-wood-machinery",
    description: "CNC mortiser for precise slot and tenon preparation.",
    dimensions: { width: 2.2, depth: 1.4, height: 1.8 },
    clearance: 0.7,
    color: "#a88868",
    parts: NESTING_PARTS,
  }),
  m({
    id: "four-side-moulder-model-mb4016d",
    slug: "four-side-moulder-model-mb4016d",
    name: "Four Side Moulder UA-523A",
    model: "UA-523A",
    category: "Four Side Moulder",
    categorySlug: "solid-wood-machinery",
    description: "Precision four-side moulder for solid wood profiles.",
    productSlug: "solid-wood-machinery-four-side-moulder-model-ua-523a",
    dimensions: { width: 3.5, depth: 1.4, height: 1.7 },
    clearance: 0.8,
    color: "#8a5a32",
    parts: SAW_PARTS,
  }),
  m({
    id: "wide-belt-sander",
    slug: "wide-belt-sander",
    name: "Wide Belt Sander RRP-1300",
    model: "RRP-1300",
    category: "Wide Belt Sander",
    categorySlug: "solid-wood-machinery",
    description: "Heavy-duty wide belt sander for calibrated finishing.",
    productSlug: "solid-wood-machinery-wide-belt-sander-model-rrp-1300",
    dimensions: { width: 2.2, depth: 1.8, height: 2.0 },
    clearance: 0.85,
    color: "#6a717a",
    parts: SAW_PARTS,
  }),
];

export function getMachine(idOrSlug: string): Machine | undefined {
  return machines.find((m) => m.id === idOrSlug || m.slug === idOrSlug);
}

export function getDefaultMachine(): Machine {
  return machines[0];
}

export function getMachineByProductSlug(slug: string): Machine | undefined {
  // Exact match only. A loose prefix/substring match used to attach the wrong
  // placeholder mesh to unrelated products (e.g. any four-side-moulder-* → MB4016D),
  // which misrepresents the machine. Explicit `productSlug` links a 3D machine to
  // a catalogue product when the slugs differ.
  return machines.find((m) => m.slug === slug || m.productSlug === slug);
}

export function getMachinesByCategory(categorySlug: string): Machine[] {
  return machines.filter((m) => m.categorySlug === categorySlug);
}

export const machineCategories = Array.from(
  new Map(
    machines.map((m) => [
      m.categorySlug,
      { slug: m.categorySlug, name: m.category },
    ])
  ).values()
);
