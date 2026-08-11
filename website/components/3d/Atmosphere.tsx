"use client";

/**
 * Shared cinematic atmosphere for MachineExplorer, Workbench, Floor Planner.
 * SceneLighting — lights · env · dust · contact shadows
 * Atmosphere   — quality-tiered post stack (SMAA · DOF · Bloom · Vignette · grain)
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  SMAA,
  Autofocus,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { colors, scene } from "@/lib/design-tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

/** MachineExplorer modes that drive DOF focus behaviour */
export type AtmosphereExplorerMode =
  | "inspect"
  | "explode"
  | "operate"
  | "parts-focus"
  | "workbench";

export type QualityPreset = "high" | "medium" | "low" | "off";

export type AtmosphereProps = {
  /** Current MachineExplorer mode */
  mode?: AtmosphereExplorerMode;
  /** World position of selected part (optional) */
  selectedPartPosition?: [number, number, number] | null;
  /** Default focus target when no part is selected */
  defaultTarget?: [number, number, number];
  /** Quality level */
  quality?: QualityPreset;
  /** Force disable all post effects */
  enabled?: boolean;
};

export type SceneLightingProps = {
  /** Enable soft contact shadows under subject */
  shadows?: boolean;
  /** Floating workshop dust particles */
  dust?: boolean;
  dustCount?: number;
  /** Env map intensity */
  envIntensity?: number;
  /** Environment preset */
  envPreset?: "warehouse" | "apartment" | "city" | "studio";
  /** Contact shadow scale */
  shadowScale?: number;
  reducedMotion?: boolean;
};

// ─── Quality table ───────────────────────────────────────────────────────────

const QUALITY_SETTINGS = {
  high: {
    bloomIntensity: 0.48,
    bloomThreshold: 0.86,
    vignetteDarkness: 0.52,
    noiseOpacity: 0.028,
    bokehScale: 3.4,
    focalLength: 0.06,
    smoothTime: 0.24,
    enableDOF: true,
    enableNoise: true,
  },
  medium: {
    bloomIntensity: 0.35,
    bloomThreshold: 0.88,
    vignetteDarkness: 0.48,
    noiseOpacity: 0.018,
    bokehScale: 2.6,
    focalLength: 0.07,
    smoothTime: 0.28,
    enableDOF: true,
    enableNoise: true,
  },
  low: {
    bloomIntensity: 0.22,
    bloomThreshold: 0.9,
    vignetteDarkness: 0.42,
    noiseOpacity: 0,
    bokehScale: 1.8,
    focalLength: 0.08,
    smoothTime: 0.32,
    enableDOF: false,
    enableNoise: false,
  },
  off: {
    bloomIntensity: 0,
    bloomThreshold: 1,
    vignetteDarkness: 0,
    noiseOpacity: 0,
    bokehScale: 0,
    focalLength: 0.1,
    smoothTime: 0.3,
    enableDOF: false,
    enableNoise: false,
  },
} as const;

// ─── Dust field ──────────────────────────────────────────────────────────────

function DustField({
  count = 80,
  reducedMotion,
}: {
  count?: number;
  reducedMotion?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = Math.random() * 3.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
  });

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.028}
        color="#c4a07a"
        transparent
        opacity={0.35}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene lighting (lights · env · dust · contact shadows) ──────────────────

export function SceneLighting({
  shadows = true,
  dust = true,
  dustCount = 72,
  envIntensity = 0.42,
  envPreset = "warehouse",
  shadowScale = 8,
  reducedMotion = false,
}: SceneLightingProps) {
  return (
    <>
      <ambientLight intensity={scene.ambientIntensity * 0.9} color="#d8d4cc" />
      <directionalLight
        castShadow={shadows}
        position={[4.2, 7.5, 3.2]}
        intensity={scene.keyLightIntensity}
        color="#ffefd6"
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight
        position={[-3.5, 2.5, -2.5]}
        intensity={scene.rimLightIntensity}
        color={colors.wood}
      />
      <pointLight
        position={[1.2, 1.8, 1.5]}
        intensity={10}
        distance={9}
        decay={2}
        color="#e0a45a"
      />
      <hemisphereLight args={["#c8d0dc", "#2a241c", 0.25]} />

      <Environment preset={envPreset} environmentIntensity={envIntensity} />

      {dust && !reducedMotion && (
        <DustField count={dustCount} reducedMotion={reducedMotion} />
      )}

      {shadows && (
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.42}
          scale={shadowScale}
          blur={2.4}
          far={5}
        />
      )}
    </>
  );
}

// ─── Post-processing stack ───────────────────────────────────────────────────

export function Atmosphere({
  mode = "inspect",
  selectedPartPosition = null,
  defaultTarget = [0, 0.55, 0],
  quality = "high",
  enabled = true,
}: AtmosphereProps) {
  if (!enabled || quality === "off") return null;

  const settings = QUALITY_SETTINGS[quality];

  // Inspect = mouse-driven DOF; other modes lock focus to part / default target
  const useMouseFocus = mode === "inspect";
  const focusTarget = selectedPartPosition ?? defaultTarget;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <SMAA />

      {settings.enableDOF ? (
        useMouseFocus ? (
          <Autofocus
            mouse
            smoothTime={settings.smoothTime}
            bokehScale={settings.bokehScale}
            focalLength={settings.focalLength}
          />
        ) : (
          <Autofocus
            target={focusTarget}
            mouse={false}
            smoothTime={settings.smoothTime + 0.04}
            bokehScale={settings.bokehScale * 0.9}
            focalLength={settings.focalLength}
          />
        )
      ) : (
        <></>
      )}

      <Bloom
        intensity={settings.bloomIntensity}
        luminanceThreshold={settings.bloomThreshold}
        luminanceSmoothing={0.2}
        mipmapBlur
      />

      <Vignette
        offset={0.28}
        darkness={settings.vignetteDarkness}
        eskil={false}
      />

      {settings.enableNoise ? (
        <Noise
          opacity={settings.noiseOpacity}
          blendFunction={BlendFunction.SOFT_LIGHT}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
}

export default Atmosphere;
