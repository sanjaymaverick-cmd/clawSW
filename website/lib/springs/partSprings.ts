/**
 * Mechanical spring configs for per-part interaction.
 * Heavy industrial feel — not bouncy UI springs.
 */

import type { SpringConfig } from "@react-spring/core";

/** Primary motion: explode / settle — deliberate mass */
export const SPRING_MECHANICAL: SpringConfig = {
  mass: 1.35,
  tension: 210,
  friction: 26,
  clamp: false,
};

/** Hover / selection scale — snappier, still damped */
export const SPRING_SCALE: SpringConfig = {
  mass: 0.85,
  tension: 320,
  friction: 22,
};

/** Click punch — fast strike, short decay */
export const SPRING_PUNCH: SpringConfig = {
  mass: 0.45,
  tension: 520,
  friction: 16,
};

/** Emissive / opacity blend */
export const SPRING_GLOW: SpringConfig = {
  mass: 0.7,
  tension: 280,
  friction: 28,
};

/** Reduced-motion: near-instant settle */
export const SPRING_INSTANT: SpringConfig = {
  duration: 1,
};

export function springConfig(reducedMotion: boolean, kind: "mech" | "scale" | "punch" | "glow" = "mech"): SpringConfig {
  if (reducedMotion) return SPRING_INSTANT;
  switch (kind) {
    case "scale":
      return SPRING_SCALE;
    case "punch":
      return SPRING_PUNCH;
    case "glow":
      return SPRING_GLOW;
    default:
      return SPRING_MECHANICAL;
  }
}

export type PartSpringTargets = {
  /** Rest position + explode offset * progress */
  position: [number, number, number];
  scale: number;
  emissive: number;
  opacity: number;
};

export function partSpringTargets(opts: {
  basePosition: [number, number, number];
  explodeOffset: [number, number, number];
  explodeProgress: number;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  punch: number;
}): PartSpringTargets {
  const { basePosition, explodeOffset, explodeProgress, hovered, selected, dimmed, punch } =
    opts;
  const p = explodeProgress;
  return {
    position: [
      basePosition[0] + explodeOffset[0] * p,
      basePosition[1] + explodeOffset[1] * p,
      basePosition[2] + explodeOffset[2] * p,
    ],
    scale: 1 + (hovered ? 0.045 : 0) + (selected ? 0.07 : 0) + punch * 0.12,
    emissive: (hovered ? 0.18 : 0) + (selected ? 0.38 : 0) + punch * 0.2,
    opacity: dimmed ? 0.28 : 1,
  };
}
