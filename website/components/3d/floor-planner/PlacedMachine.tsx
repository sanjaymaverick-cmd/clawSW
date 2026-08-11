"use client";

import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { getMachine } from "@/data/machines";
import {
  useFloorPlannerStore,
  type PlacedMachineInstance,
} from "@/lib/stores/useFloorPlannerStore";
import { colors } from "@/lib/design-tokens";

export type PlacedMachineProps = {
  instance: PlacedMachineInstance;
  onPointerDown?: (e: ThreeEvent<PointerEvent>, id: string) => void;
};

/**
 * Floor-planner machine footprint with selection highlight, clearance zone, and label.
 */
export default function PlacedMachine({
  instance,
  onPointerDown,
}: PlacedMachineProps) {
  const group = useRef<THREE.Group>(null);
  const selectedId = useFloorPlannerStore((s) => s.selectedId);
  const showClearances = useFloorPlannerStore((s) => s.showClearances);

  const machine = getMachine(instance.machineId);
  const selected = selectedId === instance.instanceId;

  const dims = machine?.dimensions ?? { width: 2, depth: 1.5, height: 1.5 };
  const clearance = machine?.clearance ?? 0.8;
  const color = machine?.color ?? "#708090";
  const name = machine?.name ?? instance.machineId;

  const bodyGeo = useMemo(
    () => new THREE.BoxGeometry(dims.width, dims.height * 0.55, dims.depth),
    [dims.width, dims.height, dims.depth]
  );

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerDown?.(e, instance.instanceId);
  };

  return (
    <group
      ref={group}
      position={[instance.x, 0, instance.z]}
      rotation={[0, instance.rotation, 0]}
    >
      {/* Clearance zone */}
      {showClearances && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          userData={{ nonSelectable: true }}
        >
          <planeGeometry
            args={[dims.width + clearance * 2, dims.depth + clearance * 2]}
          />
          <meshBasicMaterial
            color={selected ? colors.wood : colors.wood2}
            transparent
            opacity={selected ? 0.18 : 0.1}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Machine body */}
      <mesh
        castShadow
        receiveShadow
        position={[0, (dims.height * 0.55) / 2, 0]}
        geometry={bodyGeo}
        onPointerDown={handleDown}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={0.45}
          emissive={selected ? colors.wood : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>

      {/* Top accent strip */}
      <mesh
        position={[0, dims.height * 0.55 + 0.04, 0]}
        onPointerDown={handleDown}
      >
        <boxGeometry args={[dims.width * 0.9, 0.08, dims.depth * 0.5]} />
        <meshStandardMaterial
          color={selected ? colors.wood : colors.steelDark}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry
            args={[
              Math.max(dims.width, dims.depth) * 0.55,
              Math.max(dims.width, dims.depth) * 0.58,
              48,
            ]}
          />
          <meshBasicMaterial color={colors.wood} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Label */}
      <Html
        position={[0, dims.height * 0.55 + 0.35, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            background: selected
              ? "rgba(224,164,90,0.92)"
              : "rgba(20,23,28,0.85)",
            color: selected ? "#1a1206" : colors.text,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: selected
              ? "none"
              : "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          }}
        >
          {instance.label || name}
        </div>
      </Html>
    </group>
  );
}
