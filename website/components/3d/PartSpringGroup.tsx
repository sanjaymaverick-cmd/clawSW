"use client";

/**
 * Shared per-part spring shell — used by PlaceholderMachine and MachineModel.
 * Springs: explode position, scale (hover/select/punch), emissive, opacity.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { a, useSpring } from "@react-spring/three";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  partSpringTargets,
  springConfig,
} from "@/lib/springs/partSprings";

export type PartSpringGroupProps = {
  partId: string;
  label: string;
  basePosition: [number, number, number];
  explodeOffset: [number, number, number];
  explodeProgress: number;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  showLabel: boolean;
  reducedMotion?: boolean;
  color?: string;
  metalness?: number;
  roughness?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  children?: ReactNode;
  /** Animate group only (wrap custom/GLB content). */
  groupOnly?: boolean;
};

export default function PartSpringGroup({
  partId,
  label,
  basePosition,
  explodeOffset,
  explodeProgress,
  hovered,
  selected,
  dimmed,
  showLabel,
  reducedMotion = false,
  color = "#6a717a",
  metalness = 0.55,
  roughness = 0.4,
  onClick,
  onPointerOver,
  onPointerOut,
  children,
  groupOnly = false,
}: PartSpringGroupProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [punch, setPunch] = useState(0);

  const targets = partSpringTargets({
    basePosition,
    explodeOffset,
    explodeProgress,
    hovered,
    selected,
    dimmed,
    punch,
  });

  const spring = useSpring({
    position: targets.position,
    scale: targets.scale,
    emissive: targets.emissive,
    opacity: targets.opacity,
    config:
      punch > 0
        ? springConfig(reducedMotion, "punch")
        : springConfig(reducedMotion, "mech"),
  });

  // Drive material from spring values every frame
  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    const e = spring.emissive.get();
    mat.emissive.set(e > 0.01 ? "#e0a45a" : "#000000");
    mat.emissiveIntensity = e;
    mat.opacity = spring.opacity.get();
  });

  // Decay punch after click
  useEffect(() => {
    if (punch <= 0) return;
    const t = window.setTimeout(() => setPunch(0), reducedMotion ? 40 : 200);
    return () => clearTimeout(t);
  }, [punch, reducedMotion]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    setPunch(1);
    onClick?.(e);
  };

  const labelVisible = showLabel && (hovered || selected);

  return (
    <a.group
      position={spring.position as unknown as [number, number, number]}
      scale={spring.scale}
      onClick={handleClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      userData={{ partId }}
    >
      {groupOnly ? (
        children
      ) : (
        <mesh castShadow receiveShadow>
          {children}
          <meshStandardMaterial
            ref={matRef}
            color={color}
            metalness={metalness}
            roughness={roughness}
            emissive="#000000"
            emissiveIntensity={0}
            transparent
            opacity={1}
          />
        </mesh>
      )}

      {labelVisible && (
        <Html
          position={[0, 0.38, 0]}
          center
          distanceFactor={7}
          style={{ pointerEvents: "none" }}
          zIndexRange={[40, 0]}
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
              letterSpacing: "0.04em",
              color: "#e0a45a",
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sora), system-ui, sans-serif",
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </a.group>
  );
}
