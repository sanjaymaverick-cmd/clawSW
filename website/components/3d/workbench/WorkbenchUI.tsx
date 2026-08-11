"use client";

/**
 * HTML-only controls for the physics workbench.
 * Spawn tools, clear bench, toggle motion — all via useSceneStore.
 */

import {
  useSceneStore,
  type WorkbenchItemType,
} from "@/lib/stores/useSceneStore";

const SPAWNABLE: { type: WorkbenchItemType; label: string; hint: string }[] = [
  { type: "wrench", label: "Wrench", hint: "Service tool" },
  { type: "screwdriver", label: "Driver", hint: "Fasteners" },
  { type: "caliper", label: "Caliper", hint: "Measure" },
  { type: "blade", label: "Blade", hint: "Cutting spare" },
  { type: "spare-box", label: "Spares", hint: "Parts kit" },
  { type: "clamp", label: "Clamp", hint: "Hold-down" },
];

export default function WorkbenchUI() {
  const addWorkbenchItem = useSceneStore((s) => s.addWorkbenchItem);
  const clearWorkbench = useSceneStore((s) => s.clearWorkbench);
  const items = useSceneStore((s) => s.workbenchItems);
  const reducedMotion = useSceneStore((s) => s.preferences.reducedMotion);
  const setPreferences = useSceneStore((s) => s.setPreferences);

  const spawn = (type: WorkbenchItemType) => {
    const x = (Math.random() - 0.5) * 1.0;
    const z = (Math.random() - 0.5) * 0.5;
    addWorkbenchItem({
      type,
      kind: type === "spare-box" || type === "blade" ? "spare" : "tool",
      label: type,
      position: [x, 1.45, z],
      rotation: [0, Math.random() * Math.PI, 0],
    });
  };

  const dropSampleKit = () => {
    (
      [
        "wrench",
        "screwdriver",
        "caliper",
        "blade",
        "spare-box",
        "clamp",
      ] as WorkbenchItemType[]
    ).forEach((type, i) => {
      const angle = (i / 6) * Math.PI * 2;
      addWorkbenchItem({
        type,
        position: [Math.cos(angle) * 0.45, 1.5 + i * 0.02, Math.sin(angle) * 0.3],
        rotation: [0, angle, 0],
      });
    });
  };

  return (
    <div className="workbench-ui" aria-label="Workbench controls">
      <div className="workbench-ui-header">
        <div>
          <strong>Physics Workbench</strong>
          <div className="workbench-count">{items.length} items on bench</div>
        </div>
      </div>

      <div className="workbench-spawn">
        {SPAWNABLE.map((t) => (
          <button
            key={t.type}
            type="button"
            className="explorer-chip"
            title={t.hint}
            onClick={() => spawn(t.type)}
          >
            + {t.label}
          </button>
        ))}
      </div>

      <div className="workbench-actions">
        <button type="button" className="explorer-chip" onClick={dropSampleKit}>
          Drop sample kit
        </button>
        <button type="button" className="explorer-chip" onClick={clearWorkbench}>
          Clear bench
        </button>
        <button
          type="button"
          className="explorer-chip"
          onClick={() => setPreferences({ reducedMotion: !reducedMotion })}
          aria-pressed={reducedMotion}
        >
          {reducedMotion ? "Motion off" : "Motion on"}
        </button>
      </div>

      <p className="workbench-hint">
        Grab any tool — it becomes kinematic while you drag, then settles with
        damping on the wooden bench. Orbit the camera when not dragging.
      </p>
    </div>
  );
}
