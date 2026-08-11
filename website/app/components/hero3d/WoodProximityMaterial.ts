/**
 * WoodProximityMaterial
 * ---------------------
 * MeshStandardMaterial + GPU proximity glow for "the cut".
 *
 * Distance from each fragment to the saw-blade cutting ring is evaluated
 * on the GPU. Near the edge, a concentrated warm emissive + fresnel heat
 * appears — restrained industrial, never neon.
 *
 * Works with InstancedMesh (instanceMatrix handled in the injected vertex code).
 *
 * Texture slots (set on the returned material as usual):
 *   map          → albedo / wood grain
 *   normalMap    → micro surface detail
 *   roughnessMap → polished vs sawn areas
 *   aoMap        → cavity shadows (optional)
 *
 * @example
 *   const mat = createWoodProximityMaterial({ color: '#4a2f18', roughness: 0.72 })
 *   // later: mat.map = albedoTexture; mat.needsUpdate = true
 *   // every frame: mat.userData.proximity.uTime.value = t
 */

import * as THREE from "three";

export type WoodProximityUniforms = {
  uBladePos: { value: THREE.Vector3 };
  /** World → blade-local (blade faces +Z in local space). */
  uBladeInverse: { value: THREE.Matrix4 };
  uBladeRadius: { value: number };
  uGlowRadius: { value: number };
  uGlowIntensity: { value: number };
  uGlowColor: { value: THREE.Color };
  uTime: { value: number };
};

export type WoodProximityMaterial = THREE.MeshStandardMaterial & {
  userData: {
    proximity: WoodProximityUniforms;
    shader?: THREE.WebGLProgramParametersWithUniforms;
  };
};

export type CreateWoodProximityOptions = {
  /** World-space centre of the blade (default origin). */
  bladePos?: THREE.Vector3;
  /** World → blade-local matrix (default identity). */
  bladeInverse?: THREE.Matrix4;
  /** Radius of the cutting ring / outer teeth (default 1.85). */
  bladeRadius?: number;
  /** Falloff distance for the glow — keep tight for luxury (default 1.15). */
  glowRadius?: number;
  /** Emissive strength multiplier (default 1.45). */
  glowIntensity?: number;
  /** Warm ember, not neon orange (default #b85a1a). */
  glowColor?: THREE.ColorRepresentation;
};

const CACHE_KEY = "swt-wood-proximity-v3";

/**
 * Build a PBR wood material with proximity-to-blade emissive injection.
 * Prefer this over a full custom ShaderMaterial so scene lights, env maps,
 * and standard texture slots keep working.
 */
export function createWoodProximityMaterial(
  params: THREE.MeshStandardMaterialParameters = {},
  options: CreateWoodProximityOptions = {}
): WoodProximityMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: params.color ?? "#4a2f18",
    roughness: params.roughness ?? 0.72,
    metalness: params.metalness ?? 0.04,
    envMapIntensity: params.envMapIntensity ?? 0.45,
    flatShading: params.flatShading ?? false,
    ...params,
  }) as WoodProximityMaterial;

  const proximity: WoodProximityUniforms = {
    uBladePos: { value: (options.bladePos ?? new THREE.Vector3()).clone() },
    uBladeInverse: {
      value: (options.bladeInverse ?? new THREE.Matrix4()).clone(),
    },
    uBladeRadius: { value: options.bladeRadius ?? 1.85 },
    uGlowRadius: { value: options.glowRadius ?? 1.15 },
    uGlowIntensity: { value: options.glowIntensity ?? 1.45 },
    uGlowColor: {
      value: new THREE.Color(options.glowColor ?? "#b85a1a"),
    },
    uTime: { value: 0 },
  };

  mat.userData.proximity = proximity;

  mat.onBeforeCompile = (shader) => {
    // Keep a live reference so the animation loop can update uniforms cheaply.
    Object.assign(shader.uniforms, proximity);
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        varying vec3 vProxWorldPos;
        varying vec3 vProxWorldNormal;
        `
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        `
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `
        #include <project_vertex>
        {
          vec4 proxLocal = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            proxLocal = instanceMatrix * proxLocal;
          #endif
          vec4 proxWorld = modelMatrix * proxLocal;
          vProxWorldPos = proxWorld.xyz;

          vec3 proxN = objectNormal;
          #ifdef USE_INSTANCING
            mat3 im = mat3(instanceMatrix);
            proxN = im * proxN;
          #endif
          vProxWorldNormal = normalize(mat3(modelMatrix) * proxN);
        }
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        uniform vec3 uBladePos;
        uniform mat4 uBladeInverse;
        uniform float uBladeRadius;
        uniform float uGlowRadius;
        uniform float uGlowIntensity;
        uniform vec3 uGlowColor;
        uniform float uTime;
        varying vec3 vProxWorldPos;
        varying vec3 vProxWorldNormal;
        `
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `
        #include <emissivemap_fragment>

        // --- True proximity glow ("the cut") ----------------------------
        // Transform fragment into blade-local space (disc in local XY, normal +Z).
        // Distance is measured to the cutting RING, not the hub.
        vec3 localPos = (uBladeInverse * vec4(vProxWorldPos, 1.0)).xyz;
        float radial = length(localPos.xy);
        float edgeDist = abs(radial - uBladeRadius);
        float axial = abs(localPos.z);

        // Elliptical falloff: tighter on-axis, slightly wider radially.
        float d = length(vec2(edgeDist, axial * 0.72));
        float glow = 1.0 - smoothstep(0.0, uGlowRadius, d);
        // Concentrate energy — restraint is luxury.
        glow = pow(max(glow, 0.0), 1.75);

        // Soft fresnel heat on surfaces facing the viewer.
        vec3 viewDir = normalize(cameraPosition - vProxWorldPos);
        vec3 nWorld = normalize(vProxWorldNormal);
        float fresnel = pow(1.0 - clamp(dot(viewDir, nWorld), 0.0, 1.0), 2.6);

        float heat = glow * (0.68 + 0.32 * fresnel);
        // Barely perceptible micro-shimmer only when fully in the cut zone.
        heat *= 1.0 + 0.05 * sin(uTime * 3.5 + radial * 4.0) * glow;

        totalEmissiveRadiance += uGlowColor * heat * uGlowIntensity;
        `
      );
  };

  // Force a unique program so our patches don't collide with vanilla materials.
  mat.customProgramCacheKey = () => CACHE_KEY;

  return mat;
}

/** Sync shared blade uniforms across many wood materials in one pass. */
export function syncProximityUniforms(
  materials: WoodProximityMaterial[],
  opts: {
    bladePos?: THREE.Vector3;
    bladeInverse?: THREE.Matrix4;
    bladeRadius?: number;
    time?: number;
  }
) {
  for (const m of materials) {
    const u = m.userData.proximity;
    if (!u) continue;
    if (opts.bladePos) u.uBladePos.value.copy(opts.bladePos);
    if (opts.bladeInverse) u.uBladeInverse.value.copy(opts.bladeInverse);
    if (opts.bladeRadius != null) u.uBladeRadius.value = opts.bladeRadius;
    if (opts.time != null) u.uTime.value = opts.time;
  }
}
