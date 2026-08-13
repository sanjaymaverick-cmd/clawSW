"use client";

import dynamic from "next/dynamic";
import { useSceneStore } from "@/lib/stores/useSceneStore";
import CanvasWrapper from "./CanvasWrapper";
import WorkbenchUI from "./workbench/WorkbenchUI";
import { dprForQuality, useApplyAutoQuality } from "@/lib/quality";

const WorkbenchScene = dynamic(() => import("./workbench/WorkbenchScene"), {
  ssr: false,
  loading: () => null,
});

export type PhysicsWorkbenchProps = {
  height?: number | string;
  className?: string;
};

/**
 * Composer: Rapier physics scene + HTML spawn UI.
 *   WorkbenchScene  — R3F + Rapier only
 *   WorkbenchUI     — HTML only
 */
export default function PhysicsWorkbench({
  height = 460,
  className,
}: PhysicsWorkbenchProps) {
  const reducedMotion = useSceneStore((s) => s.preferences.reducedMotion);
  const quality = useSceneStore((s) => s.preferences.quality);
  const setPreferences = useSceneStore((s) => s.setPreferences);

  // Automatic quality: mobile / cores → low | medium | high
  useApplyAutoQuality(setPreferences);

  return (
    <div
      className={`physics-workbench${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        height,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <CanvasWrapper
        shadows={quality !== "low"}
        dpr={dprForQuality(quality)}
        camera={{ position: [2.4, 1.9, 2.9], fov: 40 }}
        style={{ height: "100%" }}
      >
        <WorkbenchScene reducedMotion={reducedMotion} />
      </CanvasWrapper>
      <WorkbenchUI />
    </div>
  );
}
