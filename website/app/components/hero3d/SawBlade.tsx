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
      color: "#d8dee6",
      metalness: 1,
      roughness: 0.06,
      envMapIntensity: 2.8,
      clearcoat: 0.65,
      clearcoatRoughness: 0.08,
      // Thin bright rim so the silhouette never collapses into the dark void
      emissive: new THREE.Color("#6a7480"),
      emissiveIntensity: 0.12,
    });
  }
  if (variant === "hub") {
    return new THREE.MeshStandardMaterial({
      color: BLADE.hub,
      map: steel.map,
      metalness: 0.95,
      roughness: 0.26,
      envMapIntensity: 1.7,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    // Cool polished gunmetal — light enough that HDRI reflections read as steel
    color: "#c4ccd6",
    map: steel.map,
    normalMap: steel.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: steel.roughnessMap,
    // Skip sparse metalness maps that crush metalness to 0
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 2.85,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    // Soft fill so the disc never reads as a black silhouette under dark HDRI
    emissive: new THREE.Color("#3a424c"),
    emissiveIntensity: 0.08,
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
      {/* Specular cutting rim — always on so the blade edge catches light */}
      <mesh castShadow>
        <torusGeometry args={[BLADE.radius * 0.99, mobile ? 0.014 : 0.013, 8, mobile ? 48 : 72]} />
        <meshPhysicalMaterial
          color="#e8eef5"
          metalness={1}
          roughness={0.05}
          envMapIntensity={3.1}
          clearcoat={0.7}
          clearcoatRoughness={0.08}
          emissive="#8a95a2"
          emissiveIntensity={0.18}
        />
      </mesh>
      {!mobile && (
        <mesh castShadow>
          <torusGeometry args={[BLADE.radius * 0.72, 0.006, 6, 48]} />
          <meshPhysicalMaterial
            color="#aeb8c4"
            metalness={1}
            roughness={0.14}
            envMapIntensity={2.4}
            emissive="#4a525c"
            emissiveIntensity={0.06}
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
