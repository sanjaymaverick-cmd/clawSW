/**
 * Visual + performance tuning knobs for the Hero3D scene.
 * Adjust here before diving into component code.
 */

export const BLADE = {
  /** Outer cutting radius — must match proximity shader bladeRadius. */
  radius: 1.85,
  /** Slow, deliberate industrial spin (rad/s). */
  spinSpeed: 0.16,
  gunmetal: "#3a4149",
  highlight: "#9aa3ad",
  hub: "#1c1f24",
} as const;

/**
 * Instance tint colours (multiply with photoreal grain map).
 * Near-white / warm so Imagine albedo carries real timber colour.
 */
export const WOOD_COLORS = {
  plank: ["#ffffff", "#f5ebe0", "#efe0d0", "#e8d4c0"] as const,
  chip: ["#fff8f0", "#f0e0d0", "#e8d2bc", "#f8ece0"] as const,
  shard: ["#fff6ec", "#f2e2d0", "#edd8c4"] as const,
} as const;

/** Species assigned per wood kind for grain variation. */
export const WOOD_SPECIES = {
  plank: "walnut" as const,
  chip: "oak" as const,
  shard: "teak" as const,
};

export const GLOW = {
  /** Warm ember at the cut — restrained under HDRI */
  color: "#c86a22",
  radius: 1.2,
  intensity: 1.35,
} as const;

/** Instance counts: [desktop, mobile] */
export const COUNTS = {
  planks: { desktop: 20, mobile: 9 },
  chips: { desktop: 42, mobile: 16 },
  shards: { desktop: 64, mobile: 24 },
  dust: { desktop: 140, mobile: 40 },
} as const;

export const ORBIT = {
  // Planks — heavy, outer, slow
  plank: { rMin: 2.65, rMax: 4.0, ySpread: 1.35, speed: [0.065, 0.12] as const },
  // Chips — mid belt
  chip: { rMin: 2.15, rMax: 3.45, ySpread: 1.9, speed: [0.13, 0.24] as const },
  // Shards — tight, faster dust of the cut
  shard: { rMin: 1.95, rMax: 2.95, ySpread: 2.2, speed: [0.2, 0.36] as const },
} as const;

export const CAMERA = {
  fov: 34,
  /** Rest pose */
  z: 7.1,
  y: 0.28,
  /** Scroll dolly-in distance */
  dolly: 1.55,
  rise: 0.5,
  orbit: 0.5,
} as const;

export const PARALLAX = {
  maxX: 0.32,
  maxY: 0.2,
  lerp: 0.045,
} as const;

export const LIGHT = {
  ambient: 0.2,
  key: 1.7,
  rim: 0.78,
  fill: 0.4,
  cutGlow: 26,
} as const;
