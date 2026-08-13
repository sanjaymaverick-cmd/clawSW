/**
 * Photoreal PBR textures — ambientCG 2K packs + Imagine fallbacks.
 */

import * as THREE from "three";

export type WoodSpecies = "walnut" | "oak" | "teak" | "rosewood";

export type TexturePack = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  dispose: () => void;
};

/**
 * Desktop photoreal pack — 1024 WebP (~3.4 MB total with 1K HDRI + GLB).
 * Re-export from source JPGs: `node scripts/optimize-hero3d.mjs`
 */
export const PBR_2K = {
  wood: {
    walnut: {
      albedo: "/hero3d/textures/wood-walnut/albedo.webp",
      normal: "/hero3d/textures/wood-walnut/normal.webp",
      roughness: "/hero3d/textures/wood-walnut/roughness.webp",
    },
    oak: {
      albedo: "/hero3d/textures/wood-oak/albedo.webp",
      normal: "/hero3d/textures/wood-oak/normal.webp",
      roughness: "/hero3d/textures/wood-oak/roughness.webp",
    },
    teak: {
      albedo: "/hero3d/textures/wood-teak/albedo.webp",
      normal: "/hero3d/textures/wood-teak/normal.webp",
      roughness: "/hero3d/textures/wood-teak/roughness.webp",
    },
    rosewood: {
      albedo: "/hero3d/textures/wood-walnut/albedo.webp",
      normal: "/hero3d/textures/wood-walnut/normal.webp",
      roughness: "/hero3d/textures/wood-walnut/roughness.webp",
    },
  },
  steel: {
    albedo: "/hero3d/textures/steel/albedo.webp",
    normal: "/hero3d/textures/steel/normal.webp",
    roughness: "/hero3d/textures/steel/roughness.webp",
    metalness: "/hero3d/textures/steel/metalness.webp",
  },
  floor: {
    /** Albedo only — normal/roughness unused on WorkshopFloor. */
    albedo: "/hero3d/textures/floor/albedo.webp",
  },
  hdri: "/hero3d/hdri/workshop-1k.hdr",
  bladeModel: "/hero3d/models/saw-blade.glb",
} as const;

/** Lighter Imagine JPGs for mobile. */
export const PBR_MOBILE = {
  wood: {
    walnut: {
      albedo: "/hero3d/wood-walnut.jpg",
      normal: "/hero3d/wood-normal.jpg",
      roughness: "/hero3d/wood-walnut.jpg",
    },
    oak: {
      albedo: "/hero3d/wood-oak.jpg",
      normal: "/hero3d/wood-normal.jpg",
      roughness: "/hero3d/wood-oak.jpg",
    },
    teak: {
      albedo: "/hero3d/wood-teak.jpg",
      normal: "/hero3d/wood-normal.jpg",
      roughness: "/hero3d/wood-teak.jpg",
    },
    rosewood: {
      albedo: "/hero3d/wood-walnut.jpg",
      normal: "/hero3d/wood-normal.jpg",
      roughness: "/hero3d/wood-walnut.jpg",
    },
  },
  steel: {
    albedo: "/hero3d/steel-blade.jpg",
    normal: "/hero3d/steel-normal.jpg",
    roughness: "/hero3d/steel-roughness.jpg",
    metalness: null as string | null,
  },
  floor: {
    albedo: "/hero3d/floor-concrete.jpg",
  },
  hdri: null as string | null,
  bladeModel: "/hero3d/models/saw-blade.glb",
} as const;

/** Flat list of URLs to preload for a quality tier. */
export function textureUrlsFor(mobile: boolean): string[] {
  const p = mobile ? PBR_MOBILE : PBR_2K;
  const urls: string[] = [
    p.wood.walnut.albedo,
    p.wood.walnut.normal,
    p.wood.walnut.roughness,
    p.wood.oak.albedo,
    p.wood.oak.normal,
    p.wood.oak.roughness,
    p.wood.teak.albedo,
    p.wood.teak.normal,
    p.wood.teak.roughness,
    p.steel.albedo,
    p.steel.normal,
    p.steel.roughness,
    p.floor.albedo,
  ];
  if (!mobile && "metalness" in p.steel && p.steel.metalness) {
    urls.push(p.steel.metalness);
  }
  return urls;
}

function configureMap(
  tex: THREE.Texture,
  opts: {
    colorSpace?: THREE.ColorSpace;
    wrap?: THREE.Wrapping;
    repeat?: [number, number];
    anisotropy?: number;
  } = {}
) {
  tex.wrapS = tex.wrapT = opts.wrap ?? THREE.RepeatWrapping;
  tex.colorSpace = opts.colorSpace ?? THREE.NoColorSpace;
  tex.anisotropy = opts.anisotropy ?? 8;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.needsUpdate = true;
  return tex;
}

export function cloneConfigured(
  source: THREE.Texture,
  opts: {
    colorSpace?: THREE.ColorSpace;
    wrap?: THREE.Wrapping;
    repeat?: [number, number];
    anisotropy?: number;
  } = {}
): THREE.Texture {
  const t = source.clone();
  t.image = source.image;
  return configureMap(t, opts);
}

export function packWoodFromLoaded(
  albedo: THREE.Texture,
  normal: THREE.Texture,
  roughness: THREE.Texture,
  species: WoodSpecies,
  mobile = false
): TexturePack {
  const rep: [number, number] =
    species === "walnut"
      ? [1.0, 2.2]
      : species === "oak"
        ? [1.4, 1.2]
        : [1.6, 1.4];
  const aniso = mobile ? 4 : 16;

  const map = cloneConfigured(albedo, {
    colorSpace: THREE.SRGBColorSpace,
    repeat: rep,
    anisotropy: aniso,
  });
  const normalMap = cloneConfigured(normal, {
    repeat: rep,
    anisotropy: aniso,
  });
  const roughnessMap = cloneConfigured(roughness, {
    repeat: rep,
    anisotropy: aniso,
  });

  return {
    map,
    normalMap,
    roughnessMap,
    dispose: () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function packSteelFromLoaded(
  albedo: THREE.Texture,
  normal: THREE.Texture,
  roughness: THREE.Texture,
  metalness: THREE.Texture | null,
  mobile = false
): TexturePack {
  const aniso = mobile ? 4 : 16;
  const map = cloneConfigured(albedo, {
    colorSpace: THREE.SRGBColorSpace,
    wrap: THREE.RepeatWrapping,
    repeat: [1.2, 1.2],
    anisotropy: aniso,
  });
  const normalMap = cloneConfigured(normal, {
    wrap: THREE.RepeatWrapping,
    repeat: [1.2, 1.2],
    anisotropy: aniso,
  });
  const roughnessMap = cloneConfigured(roughness, {
    wrap: THREE.RepeatWrapping,
    repeat: [1.2, 1.2],
    anisotropy: aniso,
  });
  const metalnessMap = metalness
    ? cloneConfigured(metalness, {
        wrap: THREE.RepeatWrapping,
        repeat: [1.2, 1.2],
        anisotropy: aniso,
      })
    : null;

  return {
    map,
    normalMap,
    roughnessMap,
    metalnessMap,
    dispose: () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      metalnessMap?.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Procedural fallbacks
// ---------------------------------------------------------------------------

function makeCanvas(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  return { c, ctx };
}

function toTexture(
  canvas: HTMLCanvasElement,
  opts: { colorSpace?: THREE.ColorSpace; wrap?: THREE.Wrapping } = {}
) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = opts.wrap ?? THREE.RepeatWrapping;
  tex.colorSpace = opts.colorSpace ?? THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    hash2(x0, y0) * (1 - ux) * (1 - uy) +
    hash2(x0 + 1, y0) * ux * (1 - uy) +
    hash2(x0, y0 + 1) * (1 - ux) * uy +
    hash2(x0 + 1, y0 + 1) * ux * uy
  );
}

function fbm(x: number, y: number, octaves = 4) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * smoothNoise(x * f, y * f);
    a *= 0.5;
    f *= 2;
  }
  return v;
}

export function createWoodTexturePack(
  species: WoodSpecies = "walnut",
  size = 512
): TexturePack {
  const palettes: Record<
    WoodSpecies,
    { base: number[]; mid: number[]; dark: number[]; scale: number }
  > = {
    walnut: { base: [72, 42, 22], mid: [98, 58, 30], dark: [36, 20, 10], scale: 14 },
    oak: { base: [118, 78, 42], mid: [148, 104, 58], dark: [70, 44, 24], scale: 11 },
    teak: { base: [102, 68, 32], mid: [138, 94, 44], dark: [54, 34, 16], scale: 12 },
    rosewood: { base: [82, 34, 30], mid: [118, 48, 40], dark: [44, 16, 14], scale: 16 },
  };
  const pal = palettes[species];
  const { c: albedoC, ctx: aCtx } = makeCanvas(size);
  const { c: normalC, ctx: nCtx } = makeCanvas(size);
  const { c: roughC, ctx: rCtx } = makeCanvas(size);
  const aImg = aCtx.createImageData(size, size);
  const nImg = nCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const warp = fbm(u * 3, v * 0.8, 3) * 0.35;
      const ring = Math.sin((u + warp) * Math.PI * 2 * pal.scale) * 0.5 + 0.5;
      const grain = fbm(u * 2.5 + v * 18, v * 0.4, 4);
      const t = THREE.MathUtils.clamp(ring * 0.5 + grain * 0.5, 0, 1);
      const col = [
        pal.dark[0] + (pal.mid[0] - pal.dark[0]) * t,
        pal.dark[1] + (pal.mid[1] - pal.dark[1]) * t,
        pal.dark[2] + (pal.mid[2] - pal.dark[2]) * t,
      ];
      const i = (y * size + x) * 4;
      aImg.data[i] = col[0];
      aImg.data[i + 1] = col[1];
      aImg.data[i + 2] = col[2];
      aImg.data[i + 3] = 255;
      height[y * size + x] = ring * 0.6 + grain * 0.4;
      const rv = (0.5 + (1 - t) * 0.35) * 255;
      rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = rv;
      rImg.data[i + 3] = 255;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = height[y * size + ((x - 1 + size) % size)];
      const xr = height[y * size + ((x + 1) % size)];
      const yu = height[((y - 1 + size) % size) * size + x];
      const yd = height[((y + 1) % size) * size + x];
      let nx = (xl - xr) * 4;
      let ny = (yu - yd) * 4;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      nImg.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      nImg.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      nImg.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      nImg.data[i + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  const map = toTexture(albedoC, { colorSpace: THREE.SRGBColorSpace });
  map.repeat.set(1.4, 2.2);
  const normalMap = toTexture(normalC);
  normalMap.repeat.copy(map.repeat);
  const roughnessMap = toTexture(roughC);
  roughnessMap.repeat.copy(map.repeat);
  return {
    map,
    normalMap,
    roughnessMap,
    dispose: () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function createSteelTexturePack(size = 512): TexturePack {
  const { c: albedoC, ctx: aCtx } = makeCanvas(size);
  const { c: normalC, ctx: nCtx } = makeCanvas(size);
  const { c: roughC, ctx: rCtx } = makeCanvas(size);
  const aImg = aCtx.createImageData(size, size);
  const nImg = nCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const height = new Float32Array(size * size);
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy) / (size * 0.5);
      const ang = Math.atan2(dy, dx);
      const brush = Math.sin(ang * 48 + r * 6) * 0.5 + 0.5;
      const lum = 0.28 + brush * 0.2;
      const i = (y * size + x) * 4;
      aImg.data[i] = 40 + lum * 90;
      aImg.data[i + 1] = 44 + lum * 95;
      aImg.data[i + 2] = 52 + lum * 100;
      aImg.data[i + 3] = 255;
      height[y * size + x] = brush;
      const rv = (0.28 + (1 - brush) * 0.3) * 255;
      rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = rv;
      rImg.data[i + 3] = 255;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = height[y * size + ((x - 1 + size) % size)];
      const xr = height[y * size + ((x + 1) % size)];
      const yu = height[((y - 1 + size) % size) * size + x];
      const yd = height[((y + 1) % size) * size + x];
      let nx = (xl - xr) * 3;
      let ny = (yu - yd) * 3;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      nImg.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      nImg.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      nImg.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      nImg.data[i + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  return {
    map: toTexture(albedoC, {
      colorSpace: THREE.SRGBColorSpace,
      wrap: THREE.ClampToEdgeWrapping,
    }),
    normalMap: toTexture(normalC, { wrap: THREE.ClampToEdgeWrapping }),
    roughnessMap: toTexture(roughC, { wrap: THREE.ClampToEdgeWrapping }),
    dispose() {
      this.map.dispose();
      this.normalMap.dispose();
      this.roughnessMap.dispose();
    },
  };
}

const woodCache = new Map<string, TexturePack>();
let steelCache: TexturePack | null = null;

export function getWoodTextures(species: WoodSpecies, mobile = false): TexturePack {
  const key = `${species}-${mobile ? "m" : "d"}`;
  let pack = woodCache.get(key);
  if (!pack) {
    pack = createWoodTexturePack(species, mobile ? 256 : 512);
    woodCache.set(key, pack);
  }
  return pack;
}

export function getSteelTextures(mobile = false): TexturePack {
  if (!steelCache) steelCache = createSteelTexturePack(mobile ? 256 : 512);
  return steelCache;
}
