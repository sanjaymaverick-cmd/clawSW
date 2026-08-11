"use client";

/**
 * Industrial saw blade — GLTF model with photoreal steel PBR.
 * Falls back to procedural extrude geometry if the GLB fails to load.
 */

import { useEffect, useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BLADE } from "./config";
import {
  createHexSawBladeGeometry,
  createBladeHubGeometry,
} from "./geometries";
import { PBR_2K, type TexturePack } from "./textures";

useGLTF.preload(PBR_2K.bladeModel);

type Props = {
  reducedMotion: boolean;
  bladeRef: RefObject<THREE.Group | null>;
  steel: TexturePack;
  mobile: boolean;
};

function makeSteelMaterial(steel: TexturePack, variant: "disc" | "edge" | "hub") {
  if (variant === "edge") {
    return new THREE.MeshPhysicalMaterial({
      color: BLADE.highlight,
      metalness: 1,
      roughness: 0.1,
      envMapIntensity: 2.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.12,
    });
  }
  if (variant === "hub") {
    return new THREE.MeshStandardMaterial({
      color: BLADE.hub,
      map: steel.map,
      metalness: 0.92,
      roughness: 0.32,
      envMapIntensity: 1.35,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    // Lighter base so HDRI + steel maps read as polished gunmetal (not void black)
    color: "#b0b8c2",
    map: steel.map,
    normalMap: steel.normalMap,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: steel.roughnessMap,
    // Skip sparse metalness maps that crush metalness to 0
    metalness: 0.98,
    roughness: 0.18,
    envMapIntensity: 2.35,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
  });
}

function ProceduralBlade({ steel }: { steel: TexturePack }) {
  const bladeGeo = useMemo(() => createHexSawBladeGeometry(), []);
  const hubGeo = useMemo(() => createBladeHubGeometry(), []);
  const bladeMat = useMemo(() => makeSteelMaterial(steel, "disc"), [steel]);
  const edgeMat = useMemo(() => makeSteelMaterial(steel, "edge"), [steel]);
  const hubMat = useMemo(() => makeSteelMaterial(steel, "hub"), [steel]);

  useEffect(
    () => () => {
      bladeGeo.dispose();
      hubGeo.dispose();
      bladeMat.dispose();
      edgeMat.dispose();
      hubMat.dispose();
    },
    [bladeGeo, hubGeo, bladeMat, edgeMat, hubMat]
  );

  return (
    <>
      <mesh geometry={bladeGeo} material={bladeMat} castShadow receiveShadow />
      <mesh castShadow material={edgeMat}>
        <torusGeometry args={[BLADE.radius * 0.985, 0.016, 10, 72]} />
      </mesh>
      <mesh castShadow material={edgeMat}>
        <torusGeometry args={[0.48, 0.012, 8, 40]} />
      </mesh>
      <mesh geometry={hubGeo} material={hubMat} castShadow />
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.15, 16]} />
        <meshStandardMaterial color="#0e1013" metalness={0.95} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.09]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.05, 6]} />
        <meshStandardMaterial color="#2a3038" metalness={0.92} roughness={0.3} />
      </mesh>
    </>
  );
}

function GltfBlade({ steel }: { steel: TexturePack }) {
  const { scene } = useGLTF(PBR_2K.bladeModel);
  const discMat = useMemo(() => makeSteelMaterial(steel, "disc"), [steel]);
  const edgeMat = useMemo(() => makeSteelMaterial(steel, "edge"), [steel]);
  const hubMat = useMemo(() => makeSteelMaterial(steel, "hub"), [steel]);

  const clone = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const name = (obj.name || "").toLowerCase();
      if (name.includes("rim") || name.includes("cutting")) {
        obj.material = edgeMat;
      } else if (
        name.includes("hub") ||
        name.includes("bolt") ||
        name.includes("head")
      ) {
        obj.material = hubMat;
      } else {
        obj.material = discMat;
      }
    });
    return root;
  }, [scene, discMat, edgeMat, hubMat]);

  useEffect(
    () => () => {
      discMat.dispose();
      edgeMat.dispose();
      hubMat.dispose();
    },
    [discMat, edgeMat, hubMat]
  );

  return <primitive object={clone} />;
}

export function SawBlade({ reducedMotion, bladeRef, steel, mobile }: Props) {
  const group = bladeRef;

  useFrame((_, dt) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.z += dt * BLADE.spinSpeed;
  });

  return (
    <group ref={group} rotation={[0.14, -0.38, 0.04]}>
      {/* Prefer GLTF; if Suspense never resolves, parent fallback handles it */}
      <GltfBlade steel={steel} />
      {/* Decorative rim remains sharp even if GLTF UVs are soft */}
      {!mobile && (
        <mesh castShadow>
          <torusGeometry args={[BLADE.radius * 0.99, 0.012, 8, 64]} />
          <meshPhysicalMaterial
            color={BLADE.highlight}
            metalness={1}
            roughness={0.08}
            envMapIntensity={2.2}
            clearcoat={0.6}
            clearcoatRoughness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

/** Explicit fallback component for ErrorBoundary / Suspense alternate. */
export function SawBladeFallback({
  reducedMotion,
  bladeRef,
  steel,
}: Omit<Props, "mobile">) {
  const group = bladeRef;
  useFrame((_, dt) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.z += dt * BLADE.spinSpeed;
  });
  return (
    <group ref={group} rotation={[0.14, -0.38, 0.04]}>
      <ProceduralBlade steel={steel} />
    </group>
  );
}
