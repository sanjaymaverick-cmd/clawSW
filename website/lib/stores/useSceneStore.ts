/**
 * Global 3D scene state — MachineExplorer + Physics Workbench.
 * Zustand + Immer. All significant interaction state lives here.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { MachinePartId } from "@/data/machines";

export type ExplorerMode =
  | "inspect"
  | "explode"
  | "operate"
  | "parts-focus"
  | "workbench";

export type WorkbenchItemType =
  | "wrench"
  | "screwdriver"
  | "caliper"
  | "blade"
  | "spare-box"
  | "clamp";

export type WorkbenchItem = {
  id: string;
  type: WorkbenchItemType;
  kind?: "tool" | "spare" | "part";
  label?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
};

export type ScenePreferences = {
  reducedMotion: boolean;
  quality: "high" | "medium" | "low";
  showLabels: boolean;
  autoRotate: boolean;
  shadows: boolean;
};

type SceneState = {
  mode: ExplorerMode;
  explodeProgress: number;
  selectedPart: MachinePartId | null;
  hoveredPart: MachinePartId | null;
  activeMachineId: string | null;
  workbenchItems: WorkbenchItem[];
  preferences: ScenePreferences;
  favorites: string[];
  cameraKey: number;

  setMode: (mode: ExplorerMode) => void;
  setExplodeProgress: (v: number) => void;
  setSelectedPart: (id: MachinePartId | null) => void;
  setHoveredPart: (id: MachinePartId | null) => void;
  setActiveMachineId: (id: string | null) => void;
  togglePartSelection: (id: MachinePartId) => void;

  addWorkbenchItem: (
    item: Omit<WorkbenchItem, "id"> & { id?: string }
  ) => void;
  removeWorkbenchItem: (id: string) => void;
  updateWorkbenchItem: (id: string, patch: Partial<WorkbenchItem>) => void;
  updateWorkbenchItemPosition: (
    id: string,
    position: [number, number, number]
  ) => void;
  clearWorkbench: () => void;

  setPreference: <K extends keyof ScenePreferences>(
    key: K,
    value: ScenePreferences[K]
  ) => void;
  setPreferences: (patch: Partial<ScenePreferences>) => void;
  toggleFavorite: (machineId: string) => void;
  resetExplorer: () => void;
  resetInteraction: () => void;
};

let workbenchSeq = 0;

export const useSceneStore = create<SceneState>()(
  immer((set) => ({
    mode: "inspect",
    explodeProgress: 0,
    selectedPart: null,
    hoveredPart: null,
    activeMachineId: null,
    workbenchItems: [],
    preferences: {
      reducedMotion: false,
      quality: "high",
      showLabels: true,
      autoRotate: false,
      shadows: true,
    },
    favorites: [],
    cameraKey: 0,

    setMode: (mode) =>
      set((s) => {
        s.mode = mode;
        if (mode === "inspect") s.explodeProgress = 0;
        if (mode === "explode" && s.explodeProgress < 0.05) {
          s.explodeProgress = 1;
        }
        if (mode === "operate" || mode === "parts-focus") {
          if (mode === "operate") s.explodeProgress = 0;
        }
        s.cameraKey += 1;
      }),

    setExplodeProgress: (v) =>
      set((s) => {
        s.explodeProgress = Math.max(0, Math.min(1, v));
      }),

    setSelectedPart: (id) =>
      set((s) => {
        s.selectedPart = id;
      }),

    setHoveredPart: (id) =>
      set((s) => {
        s.hoveredPart = id;
      }),

    setActiveMachineId: (id) =>
      set((s) => {
        s.activeMachineId = id;
        s.selectedPart = null;
        s.hoveredPart = null;
        s.explodeProgress = 0;
        s.mode = "inspect";
      }),

    togglePartSelection: (id) =>
      set((s) => {
        s.selectedPart = s.selectedPart === id ? null : id;
      }),

    addWorkbenchItem: (item) =>
      set((s) => {
        workbenchSeq += 1;
        s.workbenchItems.push({
          ...item,
          id: item.id ?? `wb-${workbenchSeq}-${Date.now()}`,
          type: item.type,
          position: item.position ?? [0, 0.5, 0],
        });
      }),

    removeWorkbenchItem: (id) =>
      set((s) => {
        s.workbenchItems = s.workbenchItems.filter((i) => i.id !== id);
      }),

    updateWorkbenchItem: (id, patch) =>
      set((s) => {
        const item = s.workbenchItems.find((i) => i.id === id);
        if (item) Object.assign(item, patch);
      }),

    updateWorkbenchItemPosition: (id, position) =>
      set((s) => {
        const item = s.workbenchItems.find((i) => i.id === id);
        if (item) item.position = position;
      }),

    clearWorkbench: () =>
      set((s) => {
        s.workbenchItems = [];
      }),

    setPreference: (key, value) =>
      set((s) => {
        s.preferences[key] = value;
      }),

    setPreferences: (patch) =>
      set((s) => {
        Object.assign(s.preferences, patch);
      }),

    toggleFavorite: (machineId) =>
      set((s) => {
        const i = s.favorites.indexOf(machineId);
        if (i >= 0) s.favorites.splice(i, 1);
        else s.favorites.push(machineId);
      }),

    resetExplorer: () =>
      set((s) => {
        s.mode = "inspect";
        s.explodeProgress = 0;
        s.selectedPart = null;
        s.hoveredPart = null;
        s.cameraKey += 1;
      }),

    resetInteraction: () =>
      set((s) => {
        s.mode = "inspect";
        s.explodeProgress = 0;
        s.selectedPart = null;
        s.hoveredPart = null;
        s.cameraKey += 1;
      }),
  }))
);
