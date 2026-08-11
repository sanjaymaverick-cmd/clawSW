"use client";

import { machines } from "@/data/machines";
import { useFloorPlannerStore } from "@/lib/stores/useFloorPlannerStore";
import { formatLength } from "@/lib/stores/useFloorPlannerStore";

export default function CatalogPanel() {
  const placingMachineId = useFloorPlannerStore((s) => s.placingMachineId);
  const setPlacingMachineId = useFloorPlannerStore((s) => s.setPlacingMachineId);
  const setMode = useFloorPlannerStore((s) => s.setMode);
  const units = useFloorPlannerStore((s) => s.units);

  return (
    <aside className="fp-panel fp-catalog">
      <header className="fp-panel-header">
        <h2>Machine catalog</h2>
        <p className="dim">Select a machine, then click the floor to place.</p>
      </header>
      <ul className="fp-catalog-list">
        {machines.map((m) => {
          const active = placingMachineId === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`fp-catalog-item${active ? " is-active" : ""}`}
                onClick={() => {
                  setPlacingMachineId(active ? null : m.id);
                  if (!active) setMode("place");
                }}
              >
                <span
                  className="fp-catalog-swatch"
                  style={{ background: m.color }}
                  aria-hidden
                />
                <span className="fp-catalog-meta">
                  <strong>{m.name}</strong>
                  <span className="dim">
                    {m.category}
                    {m.model ? ` · ${m.model}` : ""}
                  </span>
                  <span className="dim" style={{ fontSize: "0.75rem" }}>
                    {formatLength(m.dimensions.width, units)} ×{" "}
                    {formatLength(m.dimensions.depth, units)}
                    {" · clear "}
                    {formatLength(m.clearance, units)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
