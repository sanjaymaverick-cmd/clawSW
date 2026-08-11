"use client";

/**
 * Hero3D — Premium industrial timber hero for sanjaywoodtech.com
 * ==============================================================
 * React Three Fiber scene featuring:
 *   • Slowly rotating hexagonal industrial saw blade (gunmetal PBR)
 *   • Three separate InstancedMesh wood systems (planks / chips / shards)
 *   • True GPU proximity glow — wood emits warm heat near the blade
 *   • Mouse parallax on the orbiting field
 *   • Scroll-linked camera (dolly-in + rise + gentle orbit)
 *   • Contact shadows + bloom + N8AO + vignette (desktop)
 *   • Mobile path: fewer instances, lighter FX, lower DPR
 *
 * Structure
 * ---------
 *   Hero3D.tsx              ← this file (Canvas shell + fallback)
 *   hero3d/Scene.tsx        ← scene graph
 *   hero3d/WoodProximityMaterial.ts  ← proximity shader injection
 *   hero3d/geometries.ts    ← procedural blade + wood meshes
 *   hero3d/config.ts        ← tuning knobs (counts, colours, motion)
 *
 * Assets (CC0)
 * ------------
 *   public/hero3d/textures/   ambientCG 2K wood/steel/floor
 *   public/hero3d/hdri/       Poly Haven machine_shop_02 2K
 *   public/hero3d/models/     saw-blade.glb
 * See public/hero3d/README.md for licenses & replacement.
 */

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { HeroScene, useSceneQuality } from "./hero3d/Scene";
import { CAMERA } from "./hero3d/config";

// ---------------------------------------------------------------------------
// CSS fallback when WebGL is unavailable
// ---------------------------------------------------------------------------

const fallbackStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(48% 48% at 58% 42%, rgba(184,90,26,0.2), transparent 68%)," +
    "radial-gradient(40% 40% at 40% 60%, rgba(42,46,51,0.55), transparent 70%)," +
    "radial-gradient(circle at 50% 50%, #14171c 0%, #0a0b0d 70%)",
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

type Hero3DProps = {
  /**
   * Optional ref to the parent hero <section>.
   * Used for scroll-linked camera. If omitted, falls back to window scroll.
   */
  sectionRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
};

export default function Hero3D({ sectionRef, className, style }: Hero3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const quality = useSceneQuality();
  const [webglFailed, setWebglFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Probe WebGL once — graceful CSS fallback if unavailable
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl =
        c.getContext("webgl2") ||
        c.getContext("webgl") ||
        c.getContext("experimental-webgl");
      if (!gl) setWebglFailed(true);
    } catch {
      setWebglFailed(true);
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        ref={mountRef}
        className={className}
        aria-hidden
        style={{ position: "absolute", inset: 0, ...style }}
      />
    );
  }

  if (webglFailed) {
    return (
      <div
        ref={mountRef}
        className={className}
        aria-hidden
        style={{ ...fallbackStyle, ...style }}
      />
    );
  }

  const dpr: [number, number] = quality.isMobile ? [1, 1.25] : [1, 1.75];

  return (
    <div
      ref={mountRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        // Warm charcoal base while the canvas boots
        background: "#0a0b0d",
        ...style,
      }}
    >
      <Canvas
        dpr={dpr}
        gl={{
          antialias: !quality.isMobile,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{
          fov: CAMERA.fov,
          position: [0, CAMERA.y, CAMERA.z],
          near: 0.1,
          far: 60,
        }}
        shadows={!quality.isMobile}
        onCreated={({ gl }) => {
          gl.setClearColor(0x08090c, 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Suspense fallback={null}>
          <HeroScene quality={quality} sectionRef={sectionRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
