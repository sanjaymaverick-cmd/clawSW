"use client";

/**
 * Pure R3F + Rapier scene for the physics workbench.
 * Drag: Dynamic → KinematicPositionBased while held → Dynamic on release.
 */

import {
  useRef,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { RigidBodyType } from "@dimforge/rapier3d-compat";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  useSceneStore,
  type WorkbenchItem,
  type WorkbenchItemType,
} from "@/lib/stores/useSceneStore";
import { colors } from "@/lib/design-tokens";
import { Atmosphere, SceneLighting } from "../Atmosphere";
import { atmosphereQualityFor } from "@/lib/quality";

const OrbitCtx = createContext<{
  setEnabled: (v: boolean) => void;
} | null>(null);

const TOOL_COLORS: Record<WorkbenchItemType, string> = {
  wrench: colors.steelLight,
  screwdriver: colors.wood,
  caliper: "#8ab4c4",
  blade: "#d8dde3",
  "spare-box": colors.woodDeep,
  clamp: "#5a6a8a",
};

function ToolMesh({ type }: { type: WorkbenchItemType }) {
  switch (type) {
    case "wrench":
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.28, 0.04, 0.06]} />
            <meshStandardMaterial
              color={TOOL_COLORS.wrench}
              metalness={0.85}
              roughness={0.22}
            />
          </mesh>
          <mesh castShadow position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.05, 0.015, 8, 16]} />
            <meshStandardMaterial
              color={TOOL_COLORS.wrench}
              metalness={0.85}
              roughness={0.22}
            />
          </mesh>
        </group>
      );
    case "screwdriver":
      return (
        <group>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 12]} />
            <meshStandardMaterial color="#666" metalness={0.75} roughness={0.28} />
          </mesh>
          <mesh castShadow position={[-0.12, 0, 0]}>
            <boxGeometry args={[0.08, 0.035, 0.035]} />
            <meshStandardMaterial
              color={TOOL_COLORS.screwdriver}
              metalness={0.2}
              roughness={0.6}
            />
          </mesh>
        </group>
      );
    case "caliper":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.03, 0.08]} />
          <meshStandardMaterial
            color={TOOL_COLORS.caliper}
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
      );
    case "blade":
      return (
        <group>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.015, 32]} />
            <meshStandardMaterial
              color={TOOL_COLORS.blade}
              metalness={0.92}
              roughness={0.12}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.008, 8, 32]} />
            <meshStandardMaterial color={colors.wood} metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      );
    case "spare-box":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.1, 0.12]} />
          <meshStandardMaterial
            color={TOOL_COLORS["spare-box"]}
            metalness={0.1}
            roughness={0.75}
          />
        </mesh>
      );
    case "clamp":
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.05, 0.05]} />
            <meshStandardMaterial
              color={TOOL_COLORS.clamp}
              metalness={0.65}
              roughness={0.32}
            />
          </mesh>
          <mesh castShadow position={[0.05, 0.05, 0]}>
            <boxGeometry args={[0.03, 0.08, 0.03]} />
            <meshStandardMaterial
              color={TOOL_COLORS.clamp}
              metalness={0.65}
              roughness={0.32}
            />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      );
  }
}

function colliderSize(type: WorkbenchItemType): [number, number, number] {
  switch (type) {
    case "wrench":
      return [0.15, 0.03, 0.04];
    case "screwdriver":
      return [0.12, 0.02, 0.02];
    case "caliper":
      return [0.1, 0.02, 0.04];
    case "blade":
      return [0.1, 0.02, 0.1];
    case "spare-box":
      return [0.08, 0.05, 0.06];
    case "clamp":
      return [0.08, 0.04, 0.04];
    default:
      return [0.05, 0.05, 0.05];
  }
}

function DraggableTool({ item }: { item: WorkbenchItem }) {
  const body = useRef<RapierRigidBody>(null);
  const dragging = useRef(false);
  const dragPlaneY = useRef(0.95);
  const orbit = useContext(OrbitCtx);
  const updateWorkbenchItem = useSceneStore((s) => s.updateWorkbenchItem);
  const reducedMotion = useSceneStore((s) => s.preferences.reducedMotion);
  const { gl } = useThree();

  const half = useMemo(() => colliderSize(item.type), [item.type]);

  useFrame(({ raycaster, camera, pointer: ptr }) => {
    if (!dragging.current || !body.current) return;
    raycaster.setFromCamera(ptr, camera);
    const plane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -dragPlaneY.current
    );
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, hit)) {
      hit.x = THREE.MathUtils.clamp(hit.x, -1.15, 1.15);
      hit.z = THREE.MathUtils.clamp(hit.z, -0.58, 0.58);
      body.current.setNextKinematicTranslation({
        x: hit.x,
        y: dragPlaneY.current,
        z: hit.z,
      });
    }
  });

  const endDrag = () => {
    if (!dragging.current || !body.current) return;
    dragging.current = false;
    orbit?.setEnabled(true);
    document.body.style.cursor = "auto";
    try {
      gl.domElement.releasePointerCapture?.(
        (window.event as PointerEvent | undefined)?.pointerId ?? 0
      );
    } catch {
      /* ignore */
    }
    body.current.setBodyType(RigidBodyType.Dynamic, true);
    // gentle settle impulse
    body.current.setLinvel({ x: 0, y: -0.2, z: 0 }, true);
    const t = body.current.translation();
    const r = body.current.rotation();
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(r.x, r.y, r.z, r.w)
    );
    updateWorkbenchItem(item.id, {
      position: [t.x, t.y, t.z],
      rotation: [euler.x, euler.y, euler.z],
    });
  };

  useEffect(() => {
    const up = () => endDrag();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <RigidBody
      ref={body}
      position={item.position}
      rotation={item.rotation ?? [0, 0, 0]}
      colliders={false}
      restitution={0.12}
      friction={0.9}
      linearDamping={reducedMotion ? 2.8 : 1.5}
      angularDamping={reducedMotion ? 3.2 : 2.0}
      mass={typeMass(item.type)}
    >
      <CuboidCollider args={half} />
      <group
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!body.current) return;
          dragging.current = true;
          dragPlaneY.current = Math.max(e.point.y, 0.92);
          orbit?.setEnabled(false);
          document.body.style.cursor = "grabbing";
          try {
            (e.target as Element)?.setPointerCapture?.(e.pointerId);
          } catch {
            /* ignore */
          }
          body.current.setBodyType(RigidBodyType.KinematicPositionBased, true);
          body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          body.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }}
        onPointerUp={endDrag}
      >
        <ToolMesh type={item.type} />
      </group>
    </RigidBody>
  );
}

function typeMass(type: WorkbenchItemType): number {
  switch (type) {
    case "blade":
      return 0.55;
    case "spare-box":
      return 0.7;
    case "wrench":
      return 0.45;
    case "clamp":
      return 0.5;
    default:
      return 0.35;
  }
}

function WoodenBench() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[0, 0.78, 0]}>
        <CuboidCollider args={[1.25, 0.04, 0.65]} />
        <mesh receiveShadow castShadow>
          <boxGeometry args={[2.5, 0.08, 1.3]} />
          <meshStandardMaterial
            color={colors.benchWood}
            roughness={0.72}
            metalness={0.05}
          />
        </mesh>
      </RigidBody>
      {/* edge rail */}
      <mesh position={[0, 0.84, 0.62]} castShadow>
        <boxGeometry args={[2.5, 0.04, 0.04]} />
        <meshStandardMaterial color={colors.benchLeg} roughness={0.7} />
      </mesh>
      {(
        [
          [-1.05, 0.38, -0.5],
          [1.05, 0.38, -0.5],
          [-1.05, 0.38, 0.5],
          [1.05, 0.38, 0.5],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={pos}>
          <CuboidCollider args={[0.06, 0.38, 0.06]} />
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.76, 0.12]} />
            <meshStandardMaterial color={colors.benchLeg} roughness={0.8} />
          </mesh>
        </RigidBody>
      ))}
      <RigidBody type="fixed" colliders={false} position={[0, -0.02, 0]}>
        <CuboidCollider args={[4, 0.05, 4]} />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          position={[0, 0.02, 0]}
        >
          <planeGeometry args={[8, 8]} />
          <meshStandardMaterial color={colors.bg2} roughness={0.95} />
        </mesh>
      </RigidBody>
    </group>
  );
}

export type WorkbenchSceneProps = {
  reducedMotion?: boolean;
};

export default function WorkbenchScene({
  reducedMotion = false,
}: WorkbenchSceneProps) {
  const items = useSceneStore((s) => s.workbenchItems);
  const addWorkbenchItem = useSceneStore((s) => s.addWorkbenchItem);
  const seeded = useRef(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  useEffect(() => {
    if (seeded.current) return;
    if (items.length > 0) {
      seeded.current = true;
      return;
    }
    seeded.current = true;
    const seeds: Omit<WorkbenchItem, "id">[] = [
      { type: "wrench", position: [-0.4, 1.15, 0.1], rotation: [0, 0.3, 0] },
      { type: "screwdriver", position: [0.2, 1.2, -0.15], rotation: [0, 0, 0.2] },
      { type: "caliper", position: [0.5, 1.18, 0.2], rotation: [0, -0.4, 0] },
      { type: "blade", position: [-0.1, 1.25, -0.25], rotation: [0, 0, 0] },
      { type: "spare-box", position: [0.7, 1.2, -0.1], rotation: [0, 0.5, 0] },
      { type: "clamp", position: [-0.7, 1.2, 0.25], rotation: [0, 0, 0] },
    ];
    seeds.forEach((s) => addWorkbenchItem(s));
  }, [items.length, addWorkbenchItem]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = orbitEnabled;
    }
  }, [orbitEnabled]);

  const orbitApi = useMemo(
    () => ({
      setEnabled: (v: boolean) => setOrbitEnabled(v),
    }),
    []
  );

  const quality = useSceneStore((s) => s.preferences.quality);
  const postQuality = atmosphereQualityFor(quality, reducedMotion);

  return (
    <OrbitCtx.Provider value={orbitApi}>
      <color attach="background" args={[colors.bg]} />
      <SceneLighting
        shadows={quality !== "low"}
        dust={quality !== "low" && !reducedMotion}
        dustCount={48}
        envPreset="apartment"
        envIntensity={0.38}
        shadowScale={10}
        reducedMotion={reducedMotion}
      />
      <Atmosphere
        mode="workbench"
        selectedPartPosition={null}
        defaultTarget={[0, 0.55, 0]}
        quality={postQuality}
      />

      <Physics gravity={[0, reducedMotion ? -6 : -9.81, 0]} timeStep="vary">
        <WoodenBench />
        {items.map((item) => (
          <DraggableTool key={item.id} item={item} />
        ))}
      </Physics>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping={!reducedMotion}
        minDistance={1.5}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.85, 0]}
      />
    </OrbitCtx.Provider>
  );
}
