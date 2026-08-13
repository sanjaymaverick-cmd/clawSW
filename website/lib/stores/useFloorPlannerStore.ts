"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlannerMode = "select" | "place" | "measure";
export type UnitSystem = "metric" | "imperial";

export type PlacedMachineInstance = {
  instanceId: string;
  machineId: string;
  /** Center position on floor (m) */
  x: number;
  z: number;
  /** Yaw in radians */
  rotation: number;
  label?: string;
};

export type MeasurePoint = { x: number; z: number };

export type SavedLayout = {
  id: string;
  name: string;
  roomWidth: number;
  roomDepth: number;
  gridSize: number;
  showWalls: boolean;
  showClearances: boolean;
  units: UnitSystem;
  machines: PlacedMachineInstance[];
  createdAt: number;
  updatedAt: number;
};

export type FloorPlannerExport = {
  version: 1;
  name: string;
  roomWidth: number;
  roomDepth: number;
  gridSize: number;
  showWalls: boolean;
  showClearances: boolean;
  units: UnitSystem;
  machines: PlacedMachineInstance[];
  exportedAt: number;
};

export type FloorPlannerState = {
  roomWidth: number;
  roomDepth: number;
  gridSize: number;
  showWalls: boolean;
  showClearances: boolean;
  showGrid: boolean;
  units: UnitSystem;

  machines: PlacedMachineInstance[];
  selectedId: string | null;
  mode: PlannerMode;
  placingMachineId: string | null;

  measureStart: MeasurePoint | null;
  measureEnd: MeasurePoint | null;

  savedLayouts: SavedLayout[];
  activeLayoutId: string | null;

  setRoomDimensions: (width: number, depth: number) => void;
  setGridSize: (size: number) => void;
  setShowWalls: (v: boolean) => void;
  setShowClearances: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setUnits: (units: UnitSystem) => void;

  setMode: (mode: PlannerMode) => void;
  setPlacingMachineId: (machineId: string | null) => void;
  selectMachine: (instanceId: string | null) => void;

  placeMachine: (machineId: string, x: number, z: number) => string;
  moveMachine: (instanceId: string, x: number, z: number) => void;
  rotateMachine: (instanceId: string, deltaRad: number) => void;
  setMachineRotation: (instanceId: string, rotation: number) => void;
  duplicateMachine: (instanceId: string) => string | null;
  removeMachine: (instanceId: string) => void;
  clearMachines: () => void;

  setMeasureStart: (p: MeasurePoint | null) => void;
  setMeasureEnd: (p: MeasurePoint | null) => void;
  clearMeasure: () => void;

  snapToGrid: (value: number) => number;

  saveLayout: (name: string) => string;
  loadLayout: (id: string) => void;
  deleteLayout: (id: string) => void;
  renameLayout: (id: string, name: string) => void;

  exportJSON: () => string;
  importJSON: (json: string) => { ok: true } | { ok: false; error: string };

  resetPlanner: () => void;
};

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULTS = {
  roomWidth: 20,
  roomDepth: 16,
  gridSize: 0.5,
  showWalls: true,
  showClearances: true,
  showGrid: true,
  units: "metric" as UnitSystem,
};

export const useFloorPlannerStore = create<FloorPlannerState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      machines: [],
      selectedId: null,
      mode: "select",
      placingMachineId: null,
      measureStart: null,
      measureEnd: null,
      savedLayouts: [],
      activeLayoutId: null,

      setRoomDimensions: (width, depth) =>
        set({
          roomWidth: Math.max(4, width),
          roomDepth: Math.max(4, depth),
        }),

      setGridSize: (size) => set({ gridSize: Math.max(0.1, size) }),
      setShowWalls: (v) => set({ showWalls: v }),
      setShowClearances: (v) => set({ showClearances: v }),
      setShowGrid: (v) => set({ showGrid: v }),
      setUnits: (units) => set({ units }),

      setMode: (mode) => {
        set({ mode });
        if (mode !== "place") set({ placingMachineId: null });
        if (mode !== "measure") set({ measureStart: null, measureEnd: null });
        if (mode === "place") set({ selectedId: null });
      },

      setPlacingMachineId: (machineId) =>
        set({
          placingMachineId: machineId,
          mode: machineId ? "place" : get().mode,
        }),

      selectMachine: (instanceId) =>
        set({ selectedId: instanceId, mode: "select" }),

      snapToGrid: (value) => {
        const g = get().gridSize;
        return Math.round(value / g) * g;
      },

      placeMachine: (machineId, x, z) => {
        const snap = get().snapToGrid;
        const instanceId = uid("pm");
        const instance: PlacedMachineInstance = {
          instanceId,
          machineId,
          x: snap(x),
          z: snap(z),
          rotation: 0,
        };
        set((s) => ({
          machines: [...s.machines, instance],
          selectedId: instanceId,
          mode: "select",
          placingMachineId: null,
        }));
        return instanceId;
      },

      moveMachine: (instanceId, x, z) => {
        const snap = get().snapToGrid;
        set((s) => ({
          machines: s.machines.map((m) =>
            m.instanceId === instanceId
              ? { ...m, x: snap(x), z: snap(z) }
              : m
          ),
        }));
      },

      rotateMachine: (instanceId, deltaRad) =>
        set((s) => ({
          machines: s.machines.map((m) =>
            m.instanceId === instanceId
              ? { ...m, rotation: m.rotation + deltaRad }
              : m
          ),
        })),

      setMachineRotation: (instanceId, rotation) =>
        set((s) => ({
          machines: s.machines.map((m) =>
            m.instanceId === instanceId ? { ...m, rotation } : m
          ),
        })),

      duplicateMachine: (instanceId) => {
        const src = get().machines.find((m) => m.instanceId === instanceId);
        if (!src) return null;
        const g = get().gridSize;
        const instanceIdNew = uid("pm");
        const copy: PlacedMachineInstance = {
          ...src,
          instanceId: instanceIdNew,
          x: src.x + g * 2,
          z: src.z + g * 2,
          label: src.label ? `${src.label} (copy)` : undefined,
        };
        set((s) => ({
          machines: [...s.machines, copy],
          selectedId: instanceIdNew,
        }));
        return instanceIdNew;
      },

      removeMachine: (instanceId) =>
        set((s) => ({
          machines: s.machines.filter((m) => m.instanceId !== instanceId),
          selectedId: s.selectedId === instanceId ? null : s.selectedId,
        })),

      clearMachines: () => set({ machines: [], selectedId: null }),

      setMeasureStart: (p) => set({ measureStart: p }),
      setMeasureEnd: (p) => set({ measureEnd: p }),
      clearMeasure: () => set({ measureStart: null, measureEnd: null }),

      saveLayout: (name) => {
        const s = get();
        const now = Date.now();
        const id = uid("layout");
        const layout: SavedLayout = {
          id,
          name: name.trim() || "Untitled layout",
          roomWidth: s.roomWidth,
          roomDepth: s.roomDepth,
          gridSize: s.gridSize,
          showWalls: s.showWalls,
          showClearances: s.showClearances,
          units: s.units,
          machines: s.machines.map((m) => ({ ...m })),
          createdAt: now,
          updatedAt: now,
        };
        set({
          savedLayouts: [...s.savedLayouts, layout],
          activeLayoutId: id,
        });
        return id;
      },

      loadLayout: (id) => {
        const layout = get().savedLayouts.find((l) => l.id === id);
        if (!layout) return;
        set({
          roomWidth: layout.roomWidth,
          roomDepth: layout.roomDepth,
          gridSize: layout.gridSize,
          showWalls: layout.showWalls,
          showClearances: layout.showClearances,
          units: layout.units,
          machines: layout.machines.map((m) => ({ ...m })),
          selectedId: null,
          measureStart: null,
          measureEnd: null,
          mode: "select",
          placingMachineId: null,
          activeLayoutId: id,
        });
      },

      deleteLayout: (id) =>
        set((s) => ({
          savedLayouts: s.savedLayouts.filter((l) => l.id !== id),
          activeLayoutId: s.activeLayoutId === id ? null : s.activeLayoutId,
        })),

      renameLayout: (id, name) =>
        set((s) => ({
          savedLayouts: s.savedLayouts.map((l) =>
            l.id === id
              ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() }
              : l
          ),
        })),

      exportJSON: () => {
        const s = get();
        const payload: FloorPlannerExport = {
          version: 1,
          name: "Workshop layout",
          roomWidth: s.roomWidth,
          roomDepth: s.roomDepth,
          gridSize: s.gridSize,
          showWalls: s.showWalls,
          showClearances: s.showClearances,
          units: s.units,
          machines: s.machines.map((m) => ({ ...m })),
          exportedAt: Date.now(),
        };
        return JSON.stringify(payload, null, 2);
      },

      importJSON: (json) => {
        try {
          const data = JSON.parse(json) as Partial<FloorPlannerExport>;
          if (!data || typeof data !== "object") {
            return { ok: false, error: "Invalid JSON object" };
          }
          if (!Array.isArray(data.machines)) {
            return { ok: false, error: "Missing machines array" };
          }
          const machines: PlacedMachineInstance[] = data.machines.map((m) => ({
            instanceId: m.instanceId || uid("pm"),
            machineId: String(m.machineId),
            x: Number(m.x) || 0,
            z: Number(m.z) || 0,
            rotation: Number(m.rotation) || 0,
            label: m.label,
          }));
          set({
            roomWidth: Number(data.roomWidth) || DEFAULTS.roomWidth,
            roomDepth: Number(data.roomDepth) || DEFAULTS.roomDepth,
            gridSize: Number(data.gridSize) || DEFAULTS.gridSize,
            showWalls: data.showWalls ?? true,
            showClearances: data.showClearances ?? true,
            units: data.units === "imperial" ? "imperial" : "metric",
            machines,
            selectedId: null,
            measureStart: null,
            measureEnd: null,
            mode: "select",
            placingMachineId: null,
            activeLayoutId: null,
          });
          return { ok: true };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "Failed to parse JSON",
          };
        }
      },

      resetPlanner: () =>
        set({
          ...DEFAULTS,
          machines: [],
          selectedId: null,
          mode: "select",
          placingMachineId: null,
          measureStart: null,
          measureEnd: null,
          activeLayoutId: null,
        }),
    }),
    {
      name: "clawsw-floor-planner",
      partialize: (s) => ({
        roomWidth: s.roomWidth,
        roomDepth: s.roomDepth,
        gridSize: s.gridSize,
        showWalls: s.showWalls,
        showClearances: s.showClearances,
        showGrid: s.showGrid,
        units: s.units,
        machines: s.machines,
        savedLayouts: s.savedLayouts,
        activeLayoutId: s.activeLayoutId,
      }),
    }
  )
);

/** Format a meter length for display in current unit system */
export function formatLength(meters: number, units: UnitSystem): string {
  if (units === "imperial") {
    const feet = meters * 3.28084;
    if (feet >= 1) return `${feet.toFixed(2)} ft`;
    return `${(feet * 12).toFixed(1)} in`;
  }
  if (meters >= 1) return `${meters.toFixed(2)} m`;
  return `${(meters * 1000).toFixed(0)} mm`;
}
