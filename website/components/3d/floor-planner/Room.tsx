"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFloorPlannerStore } from "@/lib/stores/useFloorPlannerStore";
import { colors } from "@/lib/design-tokens";

/**
 * Workshop room: floor plane, optional walls, and grid helper.
 */
export default function Room() {
  const roomWidth = useFloorPlannerStore((s) => s.roomWidth);
  const roomDepth = useFloorPlannerStore((s) => s.roomDepth);
  const showWalls = useFloorPlannerStore((s) => s.showWalls);
  const showGrid = useFloorPlannerStore((s) => s.showGrid);
  const gridSize = useFloorPlannerStore((s) => s.gridSize);

  const wallH = 2.4;
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;

  const floorGeo = useMemo(
    () => new THREE.PlaneGeometry(roomWidth, roomDepth),
    [roomWidth, roomDepth]
  );

  const gridDivisions = Math.max(
    2,
    Math.round(Math.max(roomWidth, roomDepth) / gridSize)
  );

  return (
    <group>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        geometry={floorGeo}
      >
        <meshStandardMaterial
          color={colors.floorWood}
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>

      {/* Subtle floor wood strips */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          color={colors.floorWoodAlt}
          roughness={1}
          metalness={0}
          transparent
          opacity={0.25}
          wireframe={false}
        />
      </mesh>

      {showGrid && (
        <gridHelper
          args={[
            Math.max(roomWidth, roomDepth),
            gridDivisions,
            colors.wood,
            "#5a5045",
          ]}
          position={[0, 0.01, 0]}
        />
      )}

      {showWalls && (
        <>
          {/* North */}
          <mesh position={[0, wallH / 2, -halfD]} castShadow receiveShadow>
            <boxGeometry args={[roomWidth, wallH, 0.12]} />
            <meshStandardMaterial color={colors.steelDark} roughness={0.85} />
          </mesh>
          {/* South — slightly transparent so camera can see in */}
          <mesh position={[0, wallH / 2, halfD]} receiveShadow>
            <boxGeometry args={[roomWidth, wallH, 0.08]} />
            <meshStandardMaterial
              color={colors.steelDark}
              roughness={0.85}
              transparent
              opacity={0.35}
            />
          </mesh>
          {/* West */}
          <mesh position={[-halfW, wallH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.12, wallH, roomDepth]} />
            <meshStandardMaterial color="#252930" roughness={0.85} />
          </mesh>
          {/* East */}
          <mesh position={[halfW, wallH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.12, wallH, roomDepth]} />
            <meshStandardMaterial color="#252930" roughness={0.85} />
          </mesh>
        </>
      )}

      {/* Room outline on floor */}
      <lineSegments position={[0, 0.015, 0]}>
        <edgesGeometry
          args={[new THREE.BoxGeometry(roomWidth, 0.01, roomDepth)]}
        />
        <lineBasicMaterial color={colors.wood} />
      </lineSegments>
    </group>
  );
}
