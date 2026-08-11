"use client";

import { getMachine } from "@/data/machines";
import {
  useFloorPlannerStore,
  formatLength,
} from "@/lib/stores/useFloorPlannerStore";

const DEG = 180 / Math.PI;

export default function PropertiesPanel() {
  const selectedId = useFloorPlannerStore((s) => s.selectedId);
  const machines = useFloorPlannerStore((s) => s.machines);
  const rotateMachine = useFloorPlannerStore((s) => s.rotateMachine);
  const setMachineRotation = useFloorPlannerStore((s) => s.setMachineRotation);
  const duplicateMachine = useFloorPlannerStore((s) => s.duplicateMachine);
  const removeMachine = useFloorPlannerStore((s) => s.removeMachine);
  const clearMachines = useFloorPlannerStore((s) => s.clearMachines);
  const units = useFloorPlannerStore((s) => s.units);

  const instance = machines.find((m) => m.instanceId === selectedId) ?? null;
  const machine = instance ? getMachine(instance.machineId) : null;

  if (!instance || !machine) {
    return (
      <aside className="fp-panel fp-properties">
        <header className="fp-panel-header">
          <h2>Properties</h2>
          <p className="dim">
            Select a placed machine to rotate, duplicate, or remove it.
          </p>
        </header>
        {machines.length > 0 && (
          <div className="fp-props-body">
            <p className="dim" style={{ fontSize: "0.85rem" }}>
              {machines.length} machine{machines.length === 1 ? "" : "s"} on floor
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => {
                if (confirm("Remove all machines from this layout?")) {
                  clearMachines();
                }
              }}
            >
              Clear all machines
            </button>
          </div>
        )}
      </aside>
    );
  }

  const rotDeg = ((instance.rotation * DEG) % 360 + 360) % 360;

  return (
    <aside className="fp-panel fp-properties">
      <header className="fp-panel-header">
        <h2>Properties</h2>
        <p className="dim">{machine.name}</p>
      </header>
      <div className="fp-props-body">
        <dl className="fp-props-dl">
          <div>
            <dt>Model</dt>
            <dd>{machine.model ?? "—"}</dd>
          </div>
          <div>
            <dt>Footprint</dt>
            <dd>
              {formatLength(machine.dimensions.width, units)} ×{" "}
              {formatLength(machine.dimensions.depth, units)}
            </dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>
              X {formatLength(instance.x, units)}, Z{" "}
              {formatLength(instance.z, units)}
            </dd>
          </div>
          <div>
            <dt>Clearance</dt>
            <dd>{formatLength(machine.clearance, units)}</dd>
          </div>
        </dl>

        <label className="fp-rotate-label">
          Rotation ({rotDeg.toFixed(0)}°)
          <input
            type="range"
            min={0}
            max={360}
            step={15}
            value={rotDeg}
            onChange={(e) =>
              setMachineRotation(
                instance.instanceId,
                (Number(e.target.value) * Math.PI) / 180
              )
            }
          />
        </label>

        <div className="fp-props-actions">
          <button
            type="button"
            className="explorer-chip"
            onClick={() => rotateMachine(instance.instanceId, Math.PI / 2)}
          >
            Rotate 90°
          </button>
          <button
            type="button"
            className="explorer-chip"
            onClick={() => duplicateMachine(instance.instanceId)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="explorer-chip"
            style={{ color: "var(--red)" }}
            onClick={() => removeMachine(instance.instanceId)}
          >
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}
