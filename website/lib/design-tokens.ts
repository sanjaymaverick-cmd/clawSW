/**
 * Design tokens — industrial + wood palette.
 * Mirrors CSS variables in app/globals.css for use in TS / Three.js scenes.
 * Prefer CSS vars in HTML; use these constants inside R3F materials.
 */

/** Woodline design system — mirrors CSS vars in app/globals.css */

export const colors = {
  // Surfaces
  bg: "#0a0b0d",
  bg2: "#0f1114",
  surface: "#14171c",
  surface2: "#191d23",
  surface3: "#20252c",

  // Text
  text: "#f3f1ec",
  textMuted: "#a7aeb8",
  textDim: "#6b727c",

  // Wood / sawdust gold (primary accent)
  wood: "#e0a45a",
  wood2: "#c77d2e",
  woodDeep: "#8a521c",

  // Action
  red: "#ef2b3d",
  red2: "#c81e2c",

  // Status (shared public + staff)
  ok: "#34d399",
  warn: "#fbbf24",
  info: "#60a5fa",
  danger: "#f87171",

  // 3D material helpers
  steel: "#8a9099",
  steelDark: "#2a2e35",
  steelLight: "#c0c6ce",
  benchWood: "#8a5a32",
  benchLeg: "#5c3a1e",
  floorWood: "#3d3428",
  floorWoodAlt: "#4a3c2e",
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
  xxl: 96,
} as const;

/** Motion tokens — keep in sync with --motion-* in globals.css */
export const motion = {
  micro: { durationMs: 120, ease: "ease-out" },
  ui: { durationMs: 200, ease: "cubic-bezier(0.16, 1, 0.3, 1)" },
  page: { durationMs: 400, ease: "cubic-bezier(0.16, 1, 0.3, 1)" },
  cinematic: { durationMs: 800, ease: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
} as const;

export const scene = {
  /** Default ambient for product explorers */
  ambientIntensity: 0.45,
  /** Key light */
  keyLightIntensity: 1.35,
  /** Rim / wood-tinted fill */
  rimLightIntensity: 0.35,
  /** Default orbit damping */
  dampingFactor: 0.08,
} as const;

export type DesignColor = keyof typeof colors;
