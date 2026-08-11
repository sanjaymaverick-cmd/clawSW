/**
 * Pre-loaded workshop layouts for sales demos (Phase 6).
 * Importable into Floor Planner via store.importJSON.
 */

import type { FloorPlannerExport } from "@/lib/stores/useFloorPlannerStore";

export const salesLayouts: FloorPlannerExport[] = [
  {
    version: 1,
    name: "Panel line — modular furniture",
    roomWidth: 24,
    roomDepth: 18,
    gridSize: 0.5,
    showWalls: true,
    showClearances: true,
    units: "metric",
    exportedAt: Date.now(),
    machines: [
      {
        instanceId: "demo_beam",
        machineId: "beam-saw-bs-2700",
        x: -6,
        z: -2,
        rotation: 0,
        label: "Beam saw",
      },
      {
        instanceId: "demo_edge",
        machineId: "edge-banding-machine-fzb505",
        x: 2,
        z: -3,
        rotation: Math.PI / 2,
        label: "Edge bander",
      },
      {
        instanceId: "demo_nest",
        machineId: "cnc-nesting-machine-si-2409b",
        x: 6,
        z: 3,
        rotation: 0,
        label: "Nesting CNC",
      },
    ],
  },
  {
    version: 1,
    name: "Solid wood cell — joinery",
    roomWidth: 20,
    roomDepth: 14,
    gridSize: 0.5,
    showWalls: true,
    showClearances: true,
    units: "metric",
    exportedAt: Date.now(),
    machines: [
      {
        instanceId: "demo_moulder",
        machineId: "four-side-moulder-model-mb4016d",
        x: -4,
        z: 0,
        rotation: 0,
      },
      {
        instanceId: "demo_tenoner",
        machineId: "cnc-double-end-tenoner-model-cnc-dt-250",
        x: 3,
        z: -2,
        rotation: Math.PI / 2,
      },
      {
        instanceId: "demo_mortiser",
        machineId: "cnc-mortiser-model-cnc-m250",
        x: 4,
        z: 3,
        rotation: 0,
      },
    ],
  },
  {
    version: 1,
    name: "Compact starter shop",
    roomWidth: 14,
    roomDepth: 12,
    gridSize: 0.5,
    showWalls: true,
    showClearances: true,
    units: "metric",
    exportedAt: Date.now(),
    machines: [
      {
        instanceId: "demo_router",
        machineId: "cnc-router-cnc-1325",
        x: -2,
        z: 0,
        rotation: 0,
      },
      {
        instanceId: "demo_sander",
        machineId: "wide-belt-sander",
        x: 3,
        z: 1,
        rotation: Math.PI / 2,
      },
    ],
  },
];

export const salesNotes = [
  {
    id: "uptime",
    title: "Sell uptime, not just iron",
    body: "Walk the floor plan with clearances shown — service access sells the relationship.",
  },
  {
    id: "line",
    title: "Show a full line",
    body: "Load “Panel line — modular furniture” and explode the beam saw to open the spare-parts conversation.",
  },
  {
    id: "ar",
    title: "On-site AR",
    body: "Use View in AR on mobile when a simplified GLB is attached to the machine record.",
  },
];
