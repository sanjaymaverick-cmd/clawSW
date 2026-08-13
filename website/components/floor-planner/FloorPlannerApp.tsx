"use client";

/**
 * Full Floor Planner chrome: toolbar, catalog, 3D canvas, properties, saves, export.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import Toolbar from "./Toolbar";
import CatalogPanel from "./CatalogPanel";
import PropertiesPanel from "./PropertiesPanel";
import SavedLayoutsPanel from "./SavedLayoutsPanel";
import ExportMenu from "./ExportMenu";
import ViewInARButton from "@/components/3d/ViewInARButton";
import { useFloorPlannerStore } from "@/lib/stores/useFloorPlannerStore";

const FloorPlannerCanvas = dynamic(
  () => import("@/components/3d/floor-planner/FloorPlannerCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="fp-canvas-loading">Loading workshop canvas…</div>
    ),
  }
);

export default function FloorPlannerApp() {
  const mode = useFloorPlannerStore((s) => s.mode);
  const placingMachineId = useFloorPlannerStore((s) => s.placingMachineId);
  const machines = useFloorPlannerStore((s) => s.machines);

  return (
    <div className="fp-page">
      <header className="fp-page-header">
        <div className="fp-page-brand">
          <Link href="/" className="fp-home-link">
            ← Sanjay Wood Tech
          </Link>
          <h1>Workshop Floor Planner</h1>
          <p>
            {machines.length} machine{machines.length === 1 ? "" : "s"} on floor
            · mode <strong>{mode}</strong>
            {mode === "place" && placingMachineId
              ? ` · place: ${placingMachineId}`
              : ""}
            . Select a catalog machine, click the floor to place, drag to move.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <ViewInARButton
            glbUrl="/hero3d/models/saw-blade.glb"
            title="Workshop layout preview"
            size="sm"
          />
          <ExportMenu />
        </div>
      </header>

      <div className="fp-toolbar-bar">
        <Toolbar />
      </div>

      <div className="fp-page-body">
        <CatalogPanel />
        <main className="fp-canvas-wrap">
          <FloorPlannerCanvas />
          <div className="fp-canvas-hint">
            {mode === "place" &&
              "Click the floor to place the selected machine (snaps to grid)"}
            {mode === "select" &&
              "Drag machines to reposition · Select for rotate / duplicate / delete"}
            {mode === "measure" && "Click two points to measure distance"}
          </div>
        </main>
        <div className="fp-right-rail">
          <PropertiesPanel />
          <SavedLayoutsPanel />
        </div>
      </div>
    </div>
  );
}
