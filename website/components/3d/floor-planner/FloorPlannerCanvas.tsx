"use client";

import CanvasWrapper from "@/components/3d/CanvasWrapper";
import FloorScene from "./FloorScene";
import { useFloorPlannerStore } from "@/lib/stores/useFloorPlannerStore";

export default function FloorPlannerCanvas() {
  const selectMachine = useFloorPlannerStore((s) => s.selectMachine);
  const mode = useFloorPlannerStore((s) => s.mode);

  return (
    <CanvasWrapper
      shadows
      camera={{ position: [10, 14, 12], fov: 40, near: 0.1, far: 200 }}
      style={{ height: "100%", minHeight: 400 }}
      onPointerMissed={() => {
        if (mode === "select") selectMachine(null);
      }}
    >
      <FloorScene />
    </CanvasWrapper>
  );
}
