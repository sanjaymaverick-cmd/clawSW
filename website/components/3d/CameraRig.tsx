"use client";

/**
 * Smooth camera transitions when explorer mode changes.
 */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ExplorerMode } from "@/lib/stores/useSceneStore";

const POSES: Record<
  Exclude<ExplorerMode, "workbench">,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  inspect: { pos: [2.6, 1.7, 3.0], target: [0, 0.7, 0] },
  explode: { pos: [3.4, 2.4, 3.6], target: [0, 0.9, 0] },
  operate: { pos: [2.0, 1.4, 2.4], target: [0.15, 1.0, 0.1] },
  "parts-focus": { pos: [1.8, 1.6, 2.2], target: [0, 0.95, 0] },
};

type Props = {
  mode: ExplorerMode;
  reducedMotion?: boolean;
  /** OrbitControls target to keep in sync */
  orbitTarget?: THREE.Vector3;
};

export default function CameraRig({
  mode,
  reducedMotion = false,
  orbitTarget,
}: Props) {
  const { camera } = useThree();
  const goalPos = useRef(new THREE.Vector3(...POSES.inspect.pos));
  const goalTarget = useRef(new THREE.Vector3(...POSES.inspect.target));
  const look = useRef(new THREE.Vector3(...POSES.inspect.target));

  useEffect(() => {
    const key = mode === "workbench" ? "inspect" : mode;
    const pose = POSES[key];
    goalPos.current.set(...pose.pos);
    goalTarget.current.set(...pose.target);
    if (reducedMotion) {
      camera.position.copy(goalPos.current);
      look.current.copy(goalTarget.current);
      camera.lookAt(look.current);
      if (orbitTarget) orbitTarget.copy(goalTarget.current);
    }
  }, [mode, reducedMotion, camera, orbitTarget]);

  useFrame((_, dt) => {
    if (reducedMotion) return;
    const k = 1 - Math.exp(-2.4 * dt);
    camera.position.lerp(goalPos.current, k);
    look.current.lerp(goalTarget.current, k);
    if (orbitTarget) {
      orbitTarget.lerp(goalTarget.current, k);
    } else {
      camera.lookAt(look.current);
    }
  });

  return null;
}
