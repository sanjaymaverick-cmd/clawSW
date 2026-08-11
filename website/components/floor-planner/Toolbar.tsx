"use client";

import {
  useFloorPlannerStore,
  type PlannerMode,
  type UnitSystem,
} from "@/lib/stores/useFloorPlannerStore";

const MODES: { id: PlannerMode; label: string; hint: string }[] = [
  { id: "select", label: "Select", hint: "Select and drag machines" },
  { id: "place", label: "Place", hint: "Pick a machine from the catalog, then click the floor" },
  { id: "measure", label: "Measure", hint: "Click two points to measure distance" },
];

export default function Toolbar() {
  const mode = useFloorPlannerStore((s) => s.mode);
  const setMode = useFloorPlannerStore((s) => s.setMode);
  const showGrid = useFloorPlannerStore((s) => s.showGrid);
  const setShowGrid = useFloorPlannerStore((s) => s.setShowGrid);
  const showWalls = useFloorPlannerStore((s) => s.showWalls);
  const setShowWalls = useFloorPlannerStore((s) => s.setShowWalls);
  const showClearances = useFloorPlannerStore((s) => s.showClearances);
  const setShowClearances = useFloorPlannerStore((s) => s.setShowClearances);
  const units = useFloorPlannerStore((s) => s.units);
  const setUnits = useFloorPlannerStore((s) => s.setUnits);
  const roomWidth = useFloorPlannerStore((s) => s.roomWidth);
  const roomDepth = useFloorPlannerStore((s) => s.roomDepth);
  const setRoomDimensions = useFloorPlannerStore((s) => s.setRoomDimensions);
  const gridSize = useFloorPlannerStore((s) => s.gridSize);
  const setGridSize = useFloorPlannerStore((s) => s.setGridSize);
  const clearMeasure = useFloorPlannerStore((s) => s.clearMeasure);

  return (
    <div className="fp-toolbar">
      <div className="fp-toolbar-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            className={`fp-tool-btn${mode === m.id ? " is-active" : ""}`}
            onClick={() => {
              setMode(m.id);
              if (m.id !== "measure") clearMeasure();
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="fp-toolbar-toggles">
        <label className="fp-toggle">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Grid
        </label>
        <label className="fp-toggle">
          <input
            type="checkbox"
            checked={showWalls}
            onChange={(e) => setShowWalls(e.target.checked)}
          />
          Walls
        </label>
        <label className="fp-toggle">
          <input
            type="checkbox"
            checked={showClearances}
            onChange={(e) => setShowClearances(e.target.checked)}
          />
          Clearances
        </label>
      </div>

      <div className="fp-toolbar-dims">
        <label>
          W
          <input
            type="number"
            min={4}
            max={80}
            step={0.5}
            value={roomWidth}
            onChange={(e) =>
              setRoomDimensions(Number(e.target.value) || 4, roomDepth)
            }
          />
        </label>
        <label>
          D
          <input
            type="number"
            min={4}
            max={80}
            step={0.5}
            value={roomDepth}
            onChange={(e) =>
              setRoomDimensions(roomWidth, Number(e.target.value) || 4)
            }
          />
        </label>
        <label>
          Grid
          <input
            type="number"
            min={0.1}
            max={2}
            step={0.1}
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value) || 0.5)}
          />
        </label>
        <select
          value={units}
          onChange={(e) => setUnits(e.target.value as UnitSystem)}
          aria-label="Unit system"
        >
          <option value="metric">Metric (m)</option>
          <option value="imperial">Imperial (ft)</option>
        </select>
      </div>
    </div>
  );
}
