"use client";

import { Suspense, type ReactNode, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { colors } from "@/lib/design-tokens";

export type CanvasWrapperProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Perspective camera defaults (ignored fields when orthographic) */
  camera?: {
    position?: [number, number, number];
    fov?: number;
    near?: number;
    far?: number;
    zoom?: number;
  };
  shadows?: boolean;
  /** Orthographic camera for top-down tools (e.g. floor planner) */
  orthographic?: boolean;
  dpr?: [number, number] | number;
  gl?: React.ComponentProps<typeof Canvas>["gl"];
  onPointerMissed?: (event: MouseEvent) => void;
  fallback?: ReactNode;
};

const shellStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  touchAction: "none",
  background: "transparent",
  position: "relative",
};

function LoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(50% 50% at 50% 40%, rgba(224,164,90,0.08), transparent 70%), ${colors.surface}`,
        color: colors.textMuted,
        fontSize: "0.9rem",
      }}
    >
      Loading 3D scene…
    </div>
  );
}

/**
 * Shared R3F canvas shell for MachineExplorer, PhysicsWorkbench, and Floor Planner.
 * Consistent WebGL settings; pair with dynamic(..., { ssr: false }) at page boundaries.
 */
export default function CanvasWrapper({
  children,
  className,
  style,
  camera = { position: [3, 2, 4], fov: 42, near: 0.1, far: 200 },
  shadows = true,
  orthographic = false,
  dpr = [1, 1.75],
  gl,
  onPointerMissed,
  fallback,
}: CanvasWrapperProps) {
  return (
    <div className={className} style={{ ...shellStyle, ...style }}>
      <Suspense fallback={fallback ?? <LoadingFallback />}>
        <Canvas
          orthographic={orthographic}
          shadows={shadows}
          dpr={dpr}
          camera={
            orthographic
              ? {
                  position: camera.position ?? [0, 18, 0],
                  near: camera.near ?? 0.1,
                  far: camera.far ?? 200,
                  zoom: camera.zoom ?? 28,
                }
              : {
                  position: camera.position ?? [3, 2, 4],
                  fov: camera.fov ?? 42,
                  near: camera.near ?? 0.1,
                  far: camera.far ?? 200,
                }
          }
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            ...gl,
          }}
          onPointerMissed={onPointerMissed}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <AdaptiveDpr />
          <AdaptiveEvents />
          {children}
          <Preload all />
        </Canvas>
      </Suspense>
    </div>
  );
}
