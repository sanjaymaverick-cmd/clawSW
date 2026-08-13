"use client";

/**
 * GLB machine model with the same per-part spring system as PlaceholderMachine.
 * Child objects become spring-driven parts (named or indexed).
 */

import { useMemo } from "react";
import { useGLTF, Center } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Machine, MachinePartId } from "@/data/machines";
import PartSpringGroup from "./PartSpringGroup";

type Props = {
  machine: Machine;
  url: string;
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

type GltfPart = {
  id: MachinePartId;
  label: string;
  object: THREE.Object3D;
  basePosition: [number, number, number];
  explodeOffset: [number, number, number];
};

function asPartId(name: string, fallback: MachinePartId): MachinePartId {
  const n = name.toLowerCase();
  const known: MachinePartId[] = [
    "base",
    "frame",
    "table",
    "fence",
    "blade",
    "motor",
    "hood",
    "control",
    "feed",
    "column",
  ];
  for (const k of known) {
    if (n.includes(k)) return k;
  }
  return fallback;
}

export default function MachineModel({
  machine,
  url,
  explodeProgress = 0,
  selectedPart = null,
  hoveredPart = null,
  mode = "inspect",
  reducedMotion = false,
  showLabels = true,
  onPartClick,
  onPartPointerOver,
  onPartPointerOut,
}: Props) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);

  const parts = useMemo(() => {
    const handles: GltfPart[] = [];
    const defById = new Map(machine.parts.map((p) => [p.id, p]));
    const candidates: THREE.Object3D[] = [];

    if (root.children.length > 1) {
      root.children.forEach((c) => candidates.push(c));
    } else {
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o !== root) candidates.push(o);
      });
    }

    let i = 0;
    for (const obj of candidates) {
      const fallback = (machine.parts[i]?.id ?? "base") as MachinePartId;
      const id = asPartId(obj.name || "", fallback);
      const def = defById.get(id) ?? machine.parts[i];
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      // Zero local positions — spring owns world offset from base
      const base: [number, number, number] = [
        obj.position.x,
        obj.position.y,
        obj.position.z,
      ];
      obj.position.set(0, 0, 0);
      handles.push({
        id,
        label: def?.name ?? (obj.name || `Part ${i + 1}`),
        object: obj,
        basePosition: base,
        explodeOffset: def?.explodeOffset ?? [0, 0.4, 0],
      });
      i++;
    }
    return handles;
  }, [root, machine.parts]);

  const handleClick =
    (id: MachinePartId) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onPartClick?.(id);
    };
  const handleOver =
    (id: MachinePartId) => (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
      onPartPointerOver?.(id);
    };
  const handleOut = () => {
    document.body.style.cursor = "auto";
    onPartPointerOut?.();
  };

  return (
    <Center>
      <group>
        {parts.map((p) => (
          <PartSpringGroup
            key={`${p.id}-${p.label}`}
            partId={p.id}
            label={p.label}
            basePosition={p.basePosition}
            explodeOffset={p.explodeOffset}
            explodeProgress={explodeProgress}
            hovered={hoveredPart === p.id}
            selected={selectedPart === p.id}
            dimmed={Boolean(
              mode === "parts-focus" && selectedPart && selectedPart !== p.id
            )}
            showLabel={showLabels}
            reducedMotion={reducedMotion}
            groupOnly
            onClick={handleClick(p.id)}
            onPointerOver={handleOver(p.id)}
            onPointerOut={handleOut}
          >
            <primitive object={p.object} />
          </PartSpringGroup>
        ))}
      </group>
    </Center>
  );
}

export function preloadMachineGlb(url: string) {
  useGLTF.preload(url);
}
