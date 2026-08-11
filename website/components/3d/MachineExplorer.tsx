"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import CanvasWrapper from "./CanvasWrapper";
import SafeMachineModel from "./SafeMachineModel";
import { Atmosphere, SceneLighting } from "./Atmosphere";
import CameraRig from "./CameraRig";
import ViewInARButton from "./ViewInARButton";
import {
  useSceneStore,
  type ExplorerMode,
} from "@/lib/stores/useSceneStore";
import {
  getMachine,
  getDefaultMachine,
  type Machine,
  type MachinePartId,
} from "@/data/machines";
import { colors, scene } from "@/lib/design-tokens";
import {
  atmosphereQualityFor,
  dprForQuality,
  useApplyAutoQuality,
} from "@/lib/quality";

/**
 * Approximate rest positions for DOF focus (PlaceholderMachine layout).
 * Replace with real world-space reads from the part mesh when available.
 */
const PART_FOCUS: Partial<Record<MachinePartId, [number, number, number]>> = {
  base: [0, 0.12, 0],
  frame: [0, 0.55, 0],
  table: [0.15, 0.88, 0.05],
  fence: [-0.55, 1.05, 0],
  blade: [0.2, 1.05, 0.15],
  motor: [0.55, 0.55, -0.35],
  hood: [0.15, 1.35, 0.1],
  control: [-0.7, 1.15, 0.35],
  feed: [0, 0.92, 0.55],
  column: [0, 1.4, -0.15],
};

export type MachineExplorerProps = {
  machineId?: string;
  machine?: Machine;
  height?: number | string;
  onRequestQuote?: (part: MachinePartId | null, machine: Machine) => void;
  onRelatedSpares?: (part: MachinePartId, machine: Machine) => void;
  className?: string;
};

const MODES: { id: ExplorerMode; label: string; hint: string }[] = [
  { id: "inspect", label: "Inspect", hint: "Orbit & zoom freely" },
  { id: "explode", label: "Explode", hint: "Separate assemblies" },
  { id: "operate", label: "Operate", hint: "Animated cutting unit" },
  { id: "parts-focus", label: "Parts", hint: "Focus selected part" },
];

function SceneContent({
  machine,
  reducedMotion,
}: {
  machine: Machine;
  reducedMotion: boolean;
}) {
  const mode = useSceneStore((s) => s.mode);
  const explodeProgress = useSceneStore((s) => s.explodeProgress);
  // Store field is `selectedPart` (id); resolve world position when available
  const selectedPartId = useSceneStore((s) => s.selectedPart);
  const hoveredPart = useSceneStore((s) => s.hoveredPart);
  const setSelectedPart = useSceneStore((s) => s.setSelectedPart);
  const setHoveredPart = useSceneStore((s) => s.setHoveredPart);
  const showLabels = useSceneStore((s) => s.preferences.showLabels);
  const shadows = useSceneStore((s) => s.preferences.shadows);
  const autoRotate = useSceneStore((s) => s.preferences.autoRotate);
  const quality = useSceneStore((s) => s.preferences.quality);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const orbitTarget = useRef(new THREE.Vector3(0, 0.55, 0));

  const dust = quality !== "low" && !reducedMotion;
  const postQuality = atmosphereQualityFor(quality, reducedMotion);

  // Resolve approx world position of the selected part for Autofocus target.
  // Swap for a real mesh.getWorldPosition() read later if needed.
  const selectedPartPosition = useMemo(():
    | [number, number, number]
    | null => {
    if (!selectedPartId) return null;
    const base = PART_FOCUS[selectedPartId];
    if (!base) return null;
    if (mode === "explode" || explodeProgress > 0.05) {
      const part = machine.parts.find((p) => p.id === selectedPartId);
      const off = part?.explodeOffset ?? [0, 0, 0];
      const t = explodeProgress;
      return [
        base[0] + off[0] * t,
        base[1] + off[1] * t,
        base[2] + off[2] * t,
      ];
    }
    return base;
  }, [selectedPartId, mode, explodeProgress, machine.parts]);

  return (
    <>
      <color attach="background" args={[colors.bg2]} />

      {/* lights, dust, environment */}
      <SceneLighting
        shadows={shadows}
        dust={dust}
        dustCount={quality === "high" ? 80 : 40}
        reducedMotion={reducedMotion}
        shadowScale={8}
      />

      <Atmosphere
        mode={mode === "workbench" ? "inspect" : mode}
        selectedPartPosition={selectedPartPosition}
        defaultTarget={[0, 0.55, 0]}
        quality={postQuality}
      />

      <CameraRig
        mode={mode}
        reducedMotion={reducedMotion}
        orbitTarget={orbitTarget.current}
      />

      <SafeMachineModel
        machine={machine}
        mode={mode === "workbench" ? "inspect" : mode}
        explodeProgress={
          mode === "explode" || explodeProgress > 0 ? explodeProgress : 0
        }
        selectedPart={selectedPartId}
        hoveredPart={hoveredPart}
        reducedMotion={reducedMotion}
        showLabels={showLabels}
        onPartClick={(id) => setSelectedPart(id)}
        onPartPointerOver={(id) => setHoveredPart(id)}
        onPartPointerOut={() => setHoveredPart(null)}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial
          color={colors.surface}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping={!reducedMotion}
        dampingFactor={scene.dampingFactor}
        minDistance={1.5}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate={autoRotate && mode === "inspect" && !reducedMotion}
        autoRotateSpeed={0.6}
        target={orbitTarget.current}
      />
    </>
  );
}

function ExplorerOverlay({
  machine,
  onRequestQuote,
  onRelatedSpares,
}: {
  machine: Machine;
  onRequestQuote?: MachineExplorerProps["onRequestQuote"];
  onRelatedSpares?: MachineExplorerProps["onRelatedSpares"];
}) {
  const mode = useSceneStore((s) => s.mode);
  const setMode = useSceneStore((s) => s.setMode);
  const explodeProgress = useSceneStore((s) => s.explodeProgress);
  const setExplodeProgress = useSceneStore((s) => s.setExplodeProgress);
  const selectedPart = useSceneStore((s) => s.selectedPart);
  const setSelectedPart = useSceneStore((s) => s.setSelectedPart);
  const preferences = useSceneStore((s) => s.preferences);
  const setPreferences = useSceneStore((s) => s.setPreferences);
  const toggleFavorite = useSceneStore((s) => s.toggleFavorite);
  const favorites = useSceneStore((s) => s.favorites);
  const resetExplorer = useSceneStore((s) => s.resetExplorer);

  const part = useMemo(
    () => machine.parts.find((p) => p.id === selectedPart) ?? null,
    [machine.parts, selectedPart]
  );

  const isFav = favorites.includes(machine.id);
  const setPreferencesShowLabels = (v: boolean) =>
    setPreferences({ showLabels: v });

  return (
    <div className="explorer-overlay" aria-label="Machine explorer controls">
      <div className="explorer-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`explorer-mode-btn${mode === m.id ? " is-active" : ""}`}
            title={m.hint}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {(mode === "explode" || explodeProgress > 0) && (
        <div className="explorer-slider">
          <label htmlFor="explode-range">Explode</label>
          <input
            id="explode-range"
            type="range"
            min={0}
            max={100}
            value={Math.round(explodeProgress * 100)}
            onChange={(e) => setExplodeProgress(Number(e.target.value) / 100)}
          />
        </div>
      )}

      <div className="explorer-prefs">
        <button
          type="button"
          className="explorer-chip"
          onClick={() =>
            setPreferences({ reducedMotion: !preferences.reducedMotion })
          }
          aria-pressed={preferences.reducedMotion}
        >
          {preferences.reducedMotion ? "Motion off" : "Motion on"}
        </button>
        <button
          type="button"
          className="explorer-chip"
          onClick={() => setPreferences({ autoRotate: !preferences.autoRotate })}
          aria-pressed={preferences.autoRotate}
        >
          Auto-rotate
        </button>
        <button
          type="button"
          className="explorer-chip"
          onClick={() => setPreferencesShowLabels(!preferences.showLabels)}
          aria-pressed={preferences.showLabels}
        >
          {preferences.showLabels ? "Labels on" : "Labels off"}
        </button>
        <button
          type="button"
          className="explorer-chip"
          onClick={() => toggleFavorite(machine.id)}
          aria-pressed={isFav}
        >
          {isFav ? "★ Saved" : "☆ Save"}
        </button>
        <button type="button" className="explorer-chip" onClick={resetExplorer}>
          Reset
        </button>
      </div>

      {part && (
        <div className="explorer-part-card">
          <div className="explorer-part-kicker">Selected part</div>
          <h3>{part.name}</h3>
          <p>{part.description}</p>
          <div className="explorer-part-actions">
            <button
              type="button"
              className="btn btn-wood"
              style={{ padding: "10px 16px", fontSize: "0.85rem" }}
              onClick={() => onRequestQuote?.(part.id, machine)}
            >
              Request quote
            </button>
            {part.relatedSpares && part.relatedSpares.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "10px 16px", fontSize: "0.85rem" }}
                onClick={() => onRelatedSpares?.(part.id, machine)}
              >
                Related spares
              </button>
            )}
            <button
              type="button"
              className="explorer-chip"
              onClick={() => setSelectedPart(null)}
            >
              Clear
            </button>
          </div>
          {part.relatedSpares && part.relatedSpares.length > 0 && (
            <ul className="explorer-spares">
              {part.relatedSpares.map((s) => (
                <li key={s}>{s.replace(/-/g, " ")}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!part && (
        <div className="explorer-hint">
          Click a part to inspect · {machine.name}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive 3D product viewer for machine detail pages.
 * State lives in useSceneStore; HTML overlay is kept outside the R3F tree.
 */
export default function MachineExplorer({
  machineId,
  machine: machineProp,
  height = 480,
  onRequestQuote,
  onRelatedSpares,
  className,
}: MachineExplorerProps) {
  const machine =
    machineProp ??
    (machineId ? getMachine(machineId) : undefined) ??
    getDefaultMachine();

  const setActiveMachineId = useSceneStore((s) => s.setActiveMachineId);
  const setPreferences = useSceneStore((s) => s.setPreferences);
  const reducedMotion = useSceneStore((s) => s.preferences.reducedMotion);
  const quality = useSceneStore((s) => s.preferences.quality);

  useEffect(() => {
    setActiveMachineId(machine.id);
  }, [machine.id, setActiveMachineId]);

  // Automatic quality: mobile / cores → low | medium | high
  useApplyAutoQuality(setPreferences);

  const handleMissed = useCallback(() => {
    useSceneStore.getState().setSelectedPart(null);
  }, []);

  return (
    <div
      className={`machine-explorer${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        height,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <CanvasWrapper
        shadows={quality !== "low"}
        dpr={dprForQuality(quality)}
        camera={{ position: [2.6, 1.7, 3.0], fov: 40 }}
        onPointerMissed={handleMissed}
        style={{ height: "100%" }}
      >
        <SceneContent machine={machine} reducedMotion={reducedMotion} />
      </CanvasWrapper>

      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 3,
          pointerEvents: "auto",
        }}
      >
        <ViewInARButton
          glbUrl={machine.glbUrl}
          title={machine.name}
          size="sm"
        />
      </div>

      <ExplorerOverlay
        machine={machine}
        onRequestQuote={onRequestQuote}
        onRelatedSpares={onRelatedSpares}
      />
    </div>
  );
}
