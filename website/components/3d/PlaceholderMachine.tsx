"use client";

/**
 * Procedural industrial machine with per-part @react-spring/three physics.
 * Explode · hover scale · selection glow · click punch · floating labels.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Machine, MachinePartId } from "@/data/machines";
import { colors } from "@/lib/design-tokens";
import { partSpringTargets, springConfig } from "@/lib/springs/partSprings";
import PartSpringGroup from "./PartSpringGroup";

export type PlaceholderMachineProps = {
  machine: Machine;
  explodeProgress?: number;
  selectedPart?: MachinePartId | null;
  hoveredPart?: MachinePartId | null;
  mode?: "inspect" | "explode" | "operate" | "parts-focus" | "workbench";
  reducedMotion?: boolean;
  showLabels?: boolean;
  onPartClick?: (partId: MachinePartId) => void;
  onPartPointerOver?: (partId: MachinePartId) => void;
  onPartPointerOut?: () => void;
};

type PartSpec = {
  id: MachinePartId;
  position: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
  geometry: React.ReactNode;
};

export default function PlaceholderMachine({
  machine,
  explodeProgress = 0,
  selectedPart = null,
  hoveredPart = null,
  mode = "inspect",
  reducedMotion = false,
  showLabels = true,
  onPartClick,
  onPartPointerOver,
  onPartPointerOut,
}: PlaceholderMachineProps) {
  const bladeSpin = useRef(0);
  const bladeGroup = useRef<THREE.Group>(null);
  const [bladePunch, setBladePunch] = useState(0);

  const partMap = useMemo(() => {
    return new Map(machine.parts.map((p) => [p.id, p]));
  }, [machine.parts]);

  const accent = machine.color;
  const steel = colors.steel;
  const dark = colors.steelDark;
  const wood = colors.woodDeep;

  const progress = explodeProgress;
  const focusMode = mode === "parts-focus" && selectedPart;

  useFrame((_, dt) => {
    if (mode === "operate" && !reducedMotion && bladeGroup.current) {
      bladeSpin.current += dt * 2.2;
      bladeGroup.current.rotation.z = bladeSpin.current;
    }
  });

  useEffect(() => {
    if (bladePunch <= 0) return;
    const t = window.setTimeout(() => setBladePunch(0), reducedMotion ? 40 : 200);
    return () => clearTimeout(t);
  }, [bladePunch, reducedMotion]);

  const handleClick = (partId: MachinePartId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (partId === "blade") setBladePunch(1);
    onPartClick?.(partId);
  };

  const handleOver = (partId: MachinePartId) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    onPartPointerOver?.(partId);
  };

  const handleOut = () => {
    document.body.style.cursor = "auto";
    onPartPointerOut?.();
  };

  const isDimmed = (id: MachinePartId) =>
    Boolean(focusMode && selectedPart !== id);
  const isSelected = (id: MachinePartId) => selectedPart === id;
  const isHovered = (id: MachinePartId) => hoveredPart === id;
  const explodeOf = (id: MachinePartId): [number, number, number] =>
    partMap.get(id)?.explodeOffset ?? [0, 0, 0];
  const partLabel = (id: MachinePartId) => partMap.get(id)?.name ?? id;

  const scale =
    Math.min(machine.dimensions.width, machine.dimensions.depth) / 2.4;

  const parts: PartSpec[] = useMemo(() => {
    const list: PartSpec[] = [];
    if (partMap.has("base")) {
      list.push({
        id: "base",
        position: [0, 0.12, 0],
        color: dark,
        metalness: 0.4,
        roughness: 0.55,
        geometry: <boxGeometry args={[1.8, 0.24, 1.1]} />,
      });
    }
    if (partMap.has("frame")) {
      list.push({
        id: "frame",
        position: [0, 0.55, 0],
        color: steel,
        geometry: <boxGeometry args={[1.6, 0.55, 0.9]} />,
      });
    }
    if (partMap.has("table")) {
      list.push({
        id: "table",
        position: [0.15, 0.88, 0.05],
        color: wood,
        metalness: 0.15,
        roughness: 0.7,
        geometry: <boxGeometry args={[1.5, 0.08, 1.0]} />,
      });
    }
    if (partMap.has("fence")) {
      list.push({
        id: "fence",
        position: [-0.55, 1.05, 0],
        color: "#c0c6ce",
        geometry: <boxGeometry args={[0.08, 0.28, 0.95]} />,
      });
    }
    if (partMap.has("motor")) {
      list.push({
        id: "motor",
        position: [0.55, 0.55, -0.35],
        color: accent,
        metalness: 0.5,
        roughness: 0.35,
        geometry: <cylinderGeometry args={[0.18, 0.18, 0.35, 24]} />,
      });
    }
    if (partMap.has("hood")) {
      list.push({
        id: "hood",
        position: [0.15, 1.35, 0.1],
        color: "#3d4450",
        metalness: 0.3,
        roughness: 0.6,
        geometry: <boxGeometry args={[0.7, 0.25, 0.55]} />,
      });
    }
    if (partMap.has("control")) {
      list.push({
        id: "control",
        position: [-0.7, 1.15, 0.35],
        color: "#1a1e24",
        metalness: 0.2,
        roughness: 0.5,
        geometry: <boxGeometry args={[0.2, 0.35, 0.28]} />,
      });
    }
    if (partMap.has("feed")) {
      list.push({
        id: "feed",
        position: [0, 0.92, 0.55],
        color: "#5c6370",
        geometry: <boxGeometry args={[1.7, 0.1, 0.22]} />,
      });
    }
    if (partMap.has("column")) {
      list.push({
        id: "column",
        position: [0, 1.4, -0.15],
        color: steel,
        geometry: <boxGeometry args={[1.4, 0.18, 0.18]} />,
      });
    }
    return list;
  }, [partMap, accent, dark, steel, wood]);

  const bladeBase: [number, number, number] = [0.2, 1.05, 0.15];
  const bladeTargets = partSpringTargets({
    basePosition: bladeBase,
    explodeOffset: explodeOf("blade"),
    explodeProgress: progress,
    hovered: isHovered("blade"),
    selected: isSelected("blade"),
    dimmed: isDimmed("blade"),
    punch: bladePunch,
  });
  const bladeSpring = useSpring({
    position: bladeTargets.position,
    scale: bladeTargets.scale,
    config:
      bladePunch > 0
        ? springConfig(reducedMotion, "punch")
        : springConfig(reducedMotion, "mech"),
  });

  return (
    <group scale={scale}>
      {parts.map((p) => (
        <PartSpringGroup
          key={p.id}
          partId={p.id}
          label={partLabel(p.id)}
          basePosition={p.position}
          explodeOffset={explodeOf(p.id)}
          explodeProgress={progress}
          hovered={isHovered(p.id)}
          selected={isSelected(p.id)}
          dimmed={isDimmed(p.id)}
          showLabel={showLabels}
          reducedMotion={reducedMotion}
          color={p.color}
          metalness={p.metalness}
          roughness={p.roughness}
          onClick={handleClick(p.id)}
          onPointerOver={handleOver(p.id)}
          onPointerOut={handleOut}
        >
          {p.geometry}
        </PartSpringGroup>
      ))}

      {partMap.has("blade") && (
        <a.group
          position={bladeSpring.position as unknown as [number, number, number]}
          scale={bladeSpring.scale}
          onClick={handleClick("blade")}
          onPointerOver={handleOver("blade")}
          onPointerOut={handleOut}
          userData={{ partId: "blade" }}
        >
          <group ref={bladeGroup}>
            <mesh castShadow>
              <cylinderGeometry args={[0.28, 0.28, 0.05, 48]} />
              <meshStandardMaterial
                color={isSelected("blade") ? "#e0a45a" : "#d8dde3"}
                metalness={0.85}
                roughness={0.2}
                transparent
                opacity={isDimmed("blade") ? 0.28 : 1}
                emissive={
                  isSelected("blade") || isHovered("blade") ? "#e0a45a" : "#000"
                }
                emissiveIntensity={
                  isSelected("blade") ? 0.35 : isHovered("blade") ? 0.18 : 0
                }
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.28, 0.012, 8, 48]} />
              <meshStandardMaterial
                color={accent}
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
          </group>
          {showLabels && (isHovered("blade") || isSelected("blade")) && (
            <Html
              position={[0, 0.4, 0]}
              center
              distanceFactor={7}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  whiteSpace: "nowrap",
                  borderRadius: 8,
                  border: "1px solid rgba(224,164,90,0.45)",
                  background: "rgba(10,11,13,0.92)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#e0a45a",
                  fontFamily: "var(--font-sora), system-ui, sans-serif",
                }}
              >
                {partLabel("blade")}
              </div>
            </Html>
          )}
        </a.group>
      )}
    </group>
  );
}
