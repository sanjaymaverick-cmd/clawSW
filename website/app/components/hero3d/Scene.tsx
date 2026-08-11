"use client";

/**
 * Internal R3F scene graph for the premium Hero.
 * Consumed only by Hero3D.tsx — not imported by pages directly.
 */

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, useTexture } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  N8AO,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import {
  createWoodProximityMaterial,
  syncProximityUniforms,
  type WoodProximityMaterial,
} from "./WoodProximityMaterial";
import { createWoodGeometries, createDustPositions } from "./geometries";
import { SawBlade, SawBladeFallback } from "./SawBlade";
import {
  PBR_2K,
  PBR_MOBILE,
  packWoodFromLoaded,
  packSteelFromLoaded,
  cloneConfigured,
  type WoodSpecies,
  type TexturePack,
} from "./textures";
import {
  BLADE,
  WOOD_COLORS,
  WOOD_SPECIES,
  GLOW,
  COUNTS,
  ORBIT,
  CAMERA,
  PARALLAX,
  LIGHT,
} from "./config";

// ---------------------------------------------------------------------------
// Photoreal maps — ambientCG 2K desktop / Imagine mobile
// ---------------------------------------------------------------------------

type PhotoAssets = {
  wood: Record<WoodSpecies, TexturePack>;
  steel: TexturePack;
  floor: THREE.Texture;
};

function usePhotoAssets(mobile: boolean): PhotoAssets {
  const pack = mobile ? PBR_MOBILE : PBR_2K;

  const urls = [
    pack.wood.walnut.albedo,
    pack.wood.walnut.normal,
    pack.wood.walnut.roughness,
    pack.wood.oak.albedo,
    pack.wood.oak.normal,
    pack.wood.oak.roughness,
    pack.wood.teak.albedo,
    pack.wood.teak.normal,
    pack.wood.teak.roughness,
    pack.steel.albedo,
    pack.steel.normal,
    pack.steel.roughness,
    pack.floor.albedo,
    pack.floor.normal,
    pack.floor.roughness,
    // metalness only on desktop steel pack
    !mobile && "metalness" in pack.steel && pack.steel.metalness
      ? pack.steel.metalness
      : pack.steel.roughness,
  ];

  const maps = useTexture(urls);

  return useMemo(() => {
    const [
      wA,
      wN,
      wR,
      oA,
      oN,
      oR,
      tA,
      tN,
      tR,
      sA,
      sN,
      sR,
      fA,
      fN,
      fR,
      sM,
    ] = maps;

    const aniso = mobile ? 4 : 16;
    for (const t of maps) {
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }

    const wood = {
      walnut: packWoodFromLoaded(wA, wN, wR, "walnut", mobile),
      oak: packWoodFromLoaded(oA, oN, oR, "oak", mobile),
      teak: packWoodFromLoaded(tA, tN, tR, "teak", mobile),
      rosewood: packWoodFromLoaded(wA, wN, wR, "rosewood", mobile),
    };

    const steel = packSteelFromLoaded(
      sA,
      sN,
      sR,
      mobile ? null : sM,
      mobile
    );

    const floorTex = cloneConfigured(fA, {
      colorSpace: THREE.SRGBColorSpace,
      repeat: [3.2, 3.2],
      anisotropy: aniso,
    });
    // Keep normal/rough available on floor material via userData if needed later
    void fN;
    void fR;

    return { wood, steel, floor: floorTex };
  }, [maps, mobile]);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrbitParticle = {
  radius: number;
  speed: number;
  phase: number;
  y: number;
  yAmp: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  scale: number;
};

export type SceneQuality = {
  isMobile: boolean;
  reducedMotion: boolean;
};

type SceneProps = {
  quality: SceneQuality;
  /** Optional ref to the hero <section> for scroll-linked camera. */
  sectionRef?: RefObject<HTMLElement | null>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedOrbit(
  count: number,
  cfg: { rMin: number; rMax: number; ySpread: number; speed: readonly [number, number] },
  rng: () => number
): OrbitParticle[] {
  const out: OrbitParticle[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count, 1);
    out.push({
      radius: cfg.rMin + rng() * (cfg.rMax - cfg.rMin),
      speed: cfg.speed[0] + rng() * (cfg.speed[1] - cfg.speed[0]),
      phase: t * Math.PI * 2 + rng() * 0.4,
      y: (rng() - 0.5) * cfg.ySpread,
      yAmp: 0.08 + rng() * 0.18,
      spinX: (rng() - 0.5) * 0.9,
      spinY: (rng() - 0.5) * 0.7,
      spinZ: (rng() - 0.5) * 0.5,
      scale: 0.7 + rng() * 0.55,
    });
  }
  return out;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Soft procedural environment (no external HDR — CSP safe)
// ---------------------------------------------------------------------------

/** HDRI image-based lighting (desktop). RoomEnvironment fallback on mobile. */
function SceneEnvironment({ mobile }: { mobile: boolean }) {
  const { gl, scene } = useThree();

  // Mobile: lightweight procedural env (no 6MB HDR decode)
  useEffect(() => {
    if (!mobile) return;
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.05);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.85;
    return () => {
      scene.environment = null;
      envRT.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, mobile]);

  if (mobile) return null;

  return (
    <Environment
      files={PBR_2K.hdri}
      environmentIntensity={1.05}
      background={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Lighting — warm workshop key + cool steel rim + cut fill
// ---------------------------------------------------------------------------

function Lights({ mobile }: { mobile: boolean }) {
  // Desktop HDRI carries most reflection — keep direct lights restrained
  const k = mobile ? 1 : 0.55;
  return (
    <>
      <ambientLight intensity={LIGHT.ambient * (mobile ? 1 : 0.7)} color="#d4cfc4" />
      <directionalLight
        position={[5.2, 6.2, 4.5]}
        intensity={LIGHT.key * k}
        color="#ffefd6"
        castShadow={!mobile}
        shadow-mapSize-width={mobile ? 512 : 1024}
        shadow-mapSize-height={mobile ? 512 : 1024}
        shadow-camera-far={24}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.00025}
      />
      <directionalLight
        position={[-5, 2.2, -3.5]}
        intensity={LIGHT.rim * k}
        color="#9bb4cc"
      />
      <directionalLight
        position={[0.5, -3.5, 2]}
        intensity={LIGHT.fill * k}
        color="#a88868"
      />
      <pointLight
        position={[0.8, 0.15, 1.6]}
        intensity={mobile ? LIGHT.cutGlow * 0.55 : LIGHT.cutGlow * 0.75}
        distance={9}
        decay={2}
        color="#e09040"
      />
      {mobile && (
        <spotLight
          position={[2.5, 4, 3]}
          angle={0.45}
          penumbra={0.7}
          intensity={18}
          distance={16}
          color="#ffe8c8"
          castShadow={false}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Instanced wood field (separate arrays — no index hacks)
// ---------------------------------------------------------------------------

type WoodKind = "plank" | "chip" | "shard";

function WoodInstancedField({
  kind,
  particles,
  geometry,
  colorPool,
  species,
  woodPacks,
  materialsRef,
  reducedMotion,
}: {
  kind: WoodKind;
  particles: OrbitParticle[];
  geometry: THREE.BufferGeometry;
  colorPool: readonly string[];
  species: WoodSpecies;
  woodPacks: Record<WoodSpecies, TexturePack>;
  materialsRef: MutableRefObject<WoodProximityMaterial[]>;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const wood = woodPacks[species];

  const material = useMemo(() => {
    // Warm white tint — photoreal map carries true timber colour
    const base =
      kind === "plank"
        ? "#e8d4bc"
        : kind === "chip"
          ? "#f0dcc4"
          : "#ecd6b8";

    const map = wood.map.clone();
    const normalMap = wood.normalMap.clone();
    const roughnessMap = wood.roughnessMap.clone();
    map.image = wood.map.image;
    normalMap.image = wood.normalMap.image;
    roughnessMap.image = wood.roughnessMap.image;

    const rep =
      kind === "plank"
        ? new THREE.Vector2(0.85, 2.6)
        : kind === "chip"
          ? new THREE.Vector2(1.5, 1.15)
          : new THREE.Vector2(2.1, 1.35);
    map.repeat.copy(rep);
    normalMap.repeat.copy(rep);
    roughnessMap.repeat.copy(rep);
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
    normalMap.needsUpdate = true;
    roughnessMap.needsUpdate = true;

    return createWoodProximityMaterial(
      {
        color: base,
        map,
        normalMap,
        normalScale: new THREE.Vector2(
          kind === "shard" ? 0.9 : 1.35,
          kind === "shard" ? 0.9 : 1.35
        ),
        roughnessMap,
        roughness: kind === "shard" ? 0.72 : 0.55,
        metalness: 0.04,
        envMapIntensity: 0.72,
        flatShading: false,
      },
      {
        bladeRadius: BLADE.radius,
        glowRadius: GLOW.radius,
        glowIntensity: kind === "shard" ? GLOW.intensity * 1.2 : GLOW.intensity,
        glowColor: GLOW.color,
      }
    );
  }, [kind, wood]);

  // Register material for global uniform sync
  useEffect(() => {
    materialsRef.current.push(material);
    return () => {
      materialsRef.current = materialsRef.current.filter((m) => m !== material);
      // clones only — shared photoreal sources stay loaded
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
    };
  }, [material, materialsRef]);

  // Initial instance colours + matrices
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const a = p.phase;
      dummy.position.set(
        Math.cos(a) * p.radius,
        p.y,
        Math.sin(a) * p.radius
      );
      // Non-uniform scale for more organic timber billets
      const sx = p.scale * (0.85 + (i % 5) * 0.06);
      const sy = p.scale * (0.9 + (i % 3) * 0.08);
      const sz = p.scale * (0.8 + (i % 4) * 0.07);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(p.spinX * 2, p.spinY * 2, p.spinZ * 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.set(colorPool[i % colorPool.length]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles, dummy, color, colorPool]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const a = p.phase + (reducedMotion ? 0 : t * p.speed);
      const y =
        p.y +
        (reducedMotion ? 0 : Math.sin(t * 0.55 + p.phase) * p.yAmp);

      dummy.position.set(Math.cos(a) * p.radius, y, Math.sin(a) * p.radius);
      const sx = p.scale * (0.85 + (i % 5) * 0.06);
      const sy = p.scale * (0.9 + (i % 3) * 0.08);
      const sz = p.scale * (0.8 + (i % 4) * 0.07);
      dummy.scale.set(sx, sy, sz);

      if (!reducedMotion) {
        // Heavy mechanical tumble — not floaty
        dummy.rotation.set(
          p.spinX * t * 0.5,
          p.spinY * t * 0.36,
          p.spinZ * t * 0.32
        );
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, particles.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
}

function WoodSystem({
  quality,
  materialsRef,
  parallaxGroup,
  woodPacks,
}: {
  quality: SceneQuality;
  materialsRef: MutableRefObject<WoodProximityMaterial[]>;
  parallaxGroup: RefObject<THREE.Group | null>;
  woodPacks: Record<WoodSpecies, TexturePack>;
}) {
  const geoms = useMemo(() => createWoodGeometries(), []);
  const rng = useMemo(() => mulberry32(0x5a17), []);

  const counts = {
    planks: quality.isMobile ? COUNTS.planks.mobile : COUNTS.planks.desktop,
    chips: quality.isMobile ? COUNTS.chips.mobile : COUNTS.chips.desktop,
    shards: quality.isMobile ? COUNTS.shards.mobile : COUNTS.shards.desktop,
  };

  const planks = useMemo(
    () => seedOrbit(counts.planks, ORBIT.plank, rng),
    [counts.planks, rng]
  );
  const chips = useMemo(
    () => seedOrbit(counts.chips, ORBIT.chip, rng),
    [counts.chips, rng]
  );
  const shards = useMemo(
    () => seedOrbit(counts.shards, ORBIT.shard, rng),
    [counts.shards, rng]
  );

  useEffect(
    () => () => {
      geoms.plank.dispose();
      geoms.chip.dispose();
      geoms.shard.dispose();
    },
    [geoms]
  );

  // Mouse parallax on the entire orbiting system
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      target.current.x = nx * PARALLAX.maxX;
      target.current.y = -ny * PARALLAX.maxY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(() => {
    current.current.x +=
      (target.current.x - current.current.x) * PARALLAX.lerp;
    current.current.y +=
      (target.current.y - current.current.y) * PARALLAX.lerp;
    if (parallaxGroup.current) {
      parallaxGroup.current.rotation.y = current.current.x;
      parallaxGroup.current.rotation.x = current.current.y * 0.65;
    }
  });

  return (
    <group ref={parallaxGroup}>
      <WoodInstancedField
        kind="plank"
        particles={planks}
        geometry={geoms.plank}
        colorPool={WOOD_COLORS.plank}
        species={WOOD_SPECIES.plank}
        woodPacks={woodPacks}
        materialsRef={materialsRef}
        reducedMotion={quality.reducedMotion}
      />
      <WoodInstancedField
        kind="chip"
        particles={chips}
        geometry={geoms.chip}
        colorPool={WOOD_COLORS.chip}
        species={WOOD_SPECIES.chip}
        woodPacks={woodPacks}
        materialsRef={materialsRef}
        reducedMotion={quality.reducedMotion}
      />
      <WoodInstancedField
        kind="shard"
        particles={shards}
        geometry={geoms.shard}
        colorPool={WOOD_COLORS.shard}
        species={WOOD_SPECIES.shard}
        woodPacks={woodPacks}
        materialsRef={materialsRef}
        reducedMotion={quality.reducedMotion}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Atmospheric dust
// ---------------------------------------------------------------------------

function Dust({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => createDustPositions(count), [count]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo]
  );

  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.07) * 0.04;
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.028}
        color="#d4b08a"
        transparent
        opacity={0.42}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Soft ground disc so contact shadows / pieces feel grounded */
function WorkshopFloor({ map }: { map: THREE.Texture }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.9, 0]}
      receiveShadow
    >
      <circleGeometry args={[8, 72]} />
      <meshStandardMaterial
        color="#1a1c20"
        map={map}
        roughness={0.88}
        metalness={0.06}
        envMapIntensity={0.35}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Scroll-linked camera (dolly-in + rise + gentle orbit)
// ---------------------------------------------------------------------------

function ScrollCamera({
  sectionRef,
  reducedMotion,
}: {
  sectionRef?: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const progress = useRef(0);

  useFrame(() => {
    let target = 0;
    const el = sectionRef?.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      // 0 when section top at viewport top; →1 as it scrolls out
      const raw = -rect.top / Math.max(rect.height * 0.85, 1);
      target = THREE.MathUtils.clamp(raw, 0, 1);
    } else {
      // Fallback: document scroll of first viewport
      target = THREE.MathUtils.clamp(
        window.scrollY / Math.max(window.innerHeight * 0.9, 1),
        0,
        1
      );
    }

    if (reducedMotion) {
      progress.current = target;
    } else {
      progress.current += (target - progress.current) * 0.06;
    }

    const p = progress.current;
    const angle = p * CAMERA.orbit;
    camera.position.x = Math.sin(angle) * 0.85;
    camera.position.y = CAMERA.y + p * CAMERA.rise;
    camera.position.z = CAMERA.z - p * CAMERA.dolly;
    camera.lookAt(0, 0.05, 0);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Proximity uniform ticker
// ---------------------------------------------------------------------------

function ProximityTicker({
  materialsRef,
  bladeRef,
}: {
  materialsRef: MutableRefObject<WoodProximityMaterial[]>;
  bladeRef: RefObject<THREE.Group | null>;
}) {
  const bladePos = useMemo(() => new THREE.Vector3(), []);
  const bladeInverse = useMemo(() => new THREE.Matrix4(), []);

  useFrame((state) => {
    if (bladeRef.current) {
      bladeRef.current.updateWorldMatrix(true, false);
      bladePos.setFromMatrixPosition(bladeRef.current.matrixWorld);
      bladeInverse.copy(bladeRef.current.matrixWorld).invert();
    }
    syncProximityUniforms(materialsRef.current, {
      bladePos,
      bladeInverse,
      bladeRadius: BLADE.radius,
      time: state.clock.elapsedTime,
    });
  });
  return null;
}

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

function Effects({ mobile }: { mobile: boolean }) {
  if (mobile) {
    // Lightweight: restrained bloom only — no AO cost
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.42}
          luminanceThreshold={0.62}
          luminanceSmoothing={0.38}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.58} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={2} enableNormalPass={false}>
      <N8AO
        aoRadius={0.5}
        intensity={1.25}
        distanceFalloff={0.5}
        quality="medium"
        halfRes
      />
      <Bloom
        intensity={0.58}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.16} darkness={0.65} />
    </EffectComposer>
  );
}

// ---------------------------------------------------------------------------
// Root scene
// ---------------------------------------------------------------------------

export function HeroScene({ quality, sectionRef }: SceneProps) {
  const materialsRef = useRef<WoodProximityMaterial[]>([]);
  const parallaxGroup = useRef<THREE.Group>(null);
  const bladeRef = useRef<THREE.Group>(null);
  const dustCount = quality.isMobile ? COUNTS.dust.mobile : COUNTS.dust.desktop;
  // 2K CC0 maps (desktop) / lighter maps (mobile) — suspends under parent <Suspense>
  const photos = usePhotoAssets(quality.isMobile);

  return (
    <>
      <color attach="background" args={["#07080b"]} />
      <fog attach="fog" args={["#07080b", 8.2, 15.5]} />

      <SceneEnvironment mobile={quality.isMobile} />
      <Lights mobile={quality.isMobile} />
      <ScrollCamera
        sectionRef={sectionRef}
        reducedMotion={quality.reducedMotion}
      />
      <ProximityTicker materialsRef={materialsRef} bladeRef={bladeRef} />

      <group position={[0, 0.15, 0]}>
        <Suspense
          fallback={
            <SawBladeFallback
              reducedMotion={quality.reducedMotion}
              bladeRef={bladeRef}
              steel={photos.steel}
            />
          }
        >
          <SawBlade
            reducedMotion={quality.reducedMotion}
            bladeRef={bladeRef}
            steel={photos.steel}
            mobile={quality.isMobile}
          />
        </Suspense>
        <WoodSystem
          quality={quality}
          materialsRef={materialsRef}
          parallaxGroup={parallaxGroup}
          woodPacks={photos.wood}
        />
        <Dust count={dustCount} reducedMotion={quality.reducedMotion} />
      </group>

      <WorkshopFloor map={photos.floor} />

      {!quality.isMobile && (
        <ContactShadows
          position={[0, -1.88, 0]}
          opacity={0.58}
          scale={14}
          blur={2.8}
          far={5.5}
          color="#000000"
        />
      )}

      {!quality.reducedMotion && <Effects mobile={quality.isMobile} />}
    </>
  );
}

/** Detect mobile + reduced-motion once on the client. */
export function useSceneQuality(): SceneQuality {
  const [quality, setQuality] = useState<SceneQuality>({
    isMobile: false,
    reducedMotion: false,
  });

  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 820px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");

    const update = () => {
      setQuality({
        isMobile:
          mobileMq.matches ||
          coarse.matches ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
        reducedMotion: motionMq.matches,
      });
    };
    update();
    mobileMq.addEventListener("change", update);
    motionMq.addEventListener("change", update);
    return () => {
      mobileMq.removeEventListener("change", update);
      motionMq.removeEventListener("change", update);
    };
  }, []);

  return quality;
}
