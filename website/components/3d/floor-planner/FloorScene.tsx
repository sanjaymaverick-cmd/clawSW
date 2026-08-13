"use client";

import { useCallback, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import Room from "./Room";
import PlacedMachine from "./PlacedMachine";
import CaptureBridge from "./CaptureBridge";
import {
  useFloorPlannerStore,
  formatLength,
} from "@/lib/stores/useFloorPlannerStore";
import { Html } from "@react-three/drei";
import { colors } from "@/lib/design-tokens";
import { Atmosphere, SceneLighting } from "../Atmosphere";

/**
 * Floor planner scene orchestrator: room, machines, measure tools, grid snapping.
 */
export default function FloorScene() {
  const machines = useFloorPlannerStore((s) => s.machines);
  const mode = useFloorPlannerStore((s) => s.mode);
  const placingMachineId = useFloorPlannerStore((s) => s.placingMachineId);
  const placeMachine = useFloorPlannerStore((s) => s.placeMachine);
  const selectMachine = useFloorPlannerStore((s) => s.selectMachine);
  const moveMachine = useFloorPlannerStore((s) => s.moveMachine);
  const measureStart = useFloorPlannerStore((s) => s.measureStart);
  const measureEnd = useFloorPlannerStore((s) => s.measureEnd);
  const setMeasureStart = useFloorPlannerStore((s) => s.setMeasureStart);
  const setMeasureEnd = useFloorPlannerStore((s) => s.setMeasureEnd);
  const snapToGrid = useFloorPlannerStore((s) => s.snapToGrid);
  const units = useFloorPlannerStore((s) => s.units);
  const roomWidth = useFloorPlannerStore((s) => s.roomWidth);
  const roomDepth = useFloorPlannerStore((s) => s.roomDepth);

  const dragging = useRef(false);
  const dragId = useRef<string | null>(null);
  const { gl } = useThree();

  const floorPoint = useCallback(
    (e: ThreeEvent<PointerEvent | MouseEvent>) => {
      // Project onto y=0 plane
      const hit = e.point;
      return {
        x: snapToGrid(hit.x),
        z: snapToGrid(hit.z),
      };
    },
    [snapToGrid]
  );

  const clampToRoom = useCallback(
    (x: number, z: number) => ({
      x: THREE.MathUtils.clamp(x, -roomWidth / 2 + 0.5, roomWidth / 2 - 0.5),
      z: THREE.MathUtils.clamp(z, -roomDepth / 2 + 0.5, roomDepth / 2 - 0.5),
    }),
    [roomWidth, roomDepth]
  );

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = clampToRoom(floorPoint(e).x, floorPoint(e).z);

    if (mode === "place" && placingMachineId) {
      placeMachine(placingMachineId, p.x, p.z);
      return;
    }

    if (mode === "measure") {
      if (!measureStart || (measureStart && measureEnd)) {
        setMeasureStart(p);
        setMeasureEnd(null);
      } else {
        setMeasureEnd(p);
      }
      return;
    }

    // select mode — deselect when clicking empty floor
    if (mode === "select") {
      selectMachine(null);
    }
  };

  const onMachinePointerDown = (
    e: ThreeEvent<PointerEvent>,
    instanceId: string
  ) => {
    if (mode === "measure") return;
    if (mode === "place") return;

    selectMachine(instanceId);
    dragging.current = true;
    dragId.current = instanceId;
    gl.domElement.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !dragId.current) return;
    if (mode !== "select") return;
    const p = clampToRoom(floorPoint(e).x, floorPoint(e).z);
    moveMachine(dragId.current, p.x, p.z);
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragging.current) {
      dragging.current = false;
      dragId.current = null;
      try {
        gl.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
  };

  const measureDistance = useMemo(() => {
    if (!measureStart || !measureEnd) return null;
    const dx = measureEnd.x - measureStart.x;
    const dz = measureEnd.z - measureStart.z;
    return Math.sqrt(dx * dx + dz * dz);
  }, [measureStart, measureEnd]);

  const measureMid = useMemo(() => {
    if (!measureStart || !measureEnd) return null;
    return {
      x: (measureStart.x + measureEnd.x) / 2,
      z: (measureStart.z + measureEnd.z) / 2,
    };
  }, [measureStart, measureEnd]);

  return (
    <>
      <CaptureBridge />
      <color attach="background" args={[colors.bg]} />
      <SceneLighting
        shadows
        dust
        dustCount={36}
        envPreset="warehouse"
        envIntensity={0.3}
        shadowScale={24}
      />
      {/* Post stack off in planner — clarity over cinematic look */}
      <Atmosphere quality="off" />
      <directionalLight
        castShadow
        position={[8, 16, 6]}
        intensity={0.85}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Room />

      {/* Invisible interaction plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        onClick={onFloorClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <planeGeometry args={[roomWidth + 4, roomDepth + 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {machines.map((m) => (
        <PlacedMachine
          key={m.instanceId}
          instance={m}
          onPointerDown={onMachinePointerDown}
        />
      ))}

      {/* Measure visualization */}
      {measureStart && (
        <mesh position={[measureStart.x, 0.05, measureStart.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ef2b3d" />
        </mesh>
      )}
      {measureEnd && (
        <mesh position={[measureEnd.x, 0.05, measureEnd.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ef2b3d" />
        </mesh>
      )}
      {measureStart && measureEnd && (
        <>
          <Line
            points={[
              [measureStart.x, 0.06, measureStart.z],
              [measureEnd.x, 0.06, measureEnd.z],
            ]}
            color="#ef2b3d"
            lineWidth={2}
          />
          {measureMid && measureDistance !== null && (
            <Html
              position={[measureMid.x, 0.4, measureMid.z]}
              center
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  background: "rgba(239,43,61,0.95)",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                {formatLength(measureDistance, units)}
              </div>
            </Html>
          )}
        </>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2.15}
        minDistance={4}
        maxDistance={50}
        target={[0, 0, 0]}
      />
    </>
  );
}
