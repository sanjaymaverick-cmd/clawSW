/**
 * Adaptive quality helpers for 3D experiences.
 * Automatic detection: mobile UA / core count → high | medium | low.
 */

import { useEffect, useState } from "react";

/** Canvas / scene tier (no post-off) */
export type QualityTier = "high" | "medium" | "low";

/** Atmosphere post stack (includes full disable) */
export type QualityPreset = QualityTier | "off";

export type AutoQualityResult = {
  quality: QualityTier;
  isMobile: boolean;
  reducedMotion: boolean;
  shadows: boolean;
  cores: number;
};

/**
 * Detect recommended 3D quality for the current device.
 *
 * Rules (primary):
 *   mobile UA  OR  cores ≤ 4  →  low
 *   cores ≤ 6                 →  medium
 *   else                      →  high
 *
 * Softeners:
 *   low deviceMemory (≤ 4 GB) never above medium
 *   prefers-reduced-motion    caps high → medium and sets reducedMotion
 */
export function detectAutoQuality(): AutoQualityResult {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      quality: "high",
      isMobile: false,
      reducedMotion: false,
      shadows: true,
      cores: 8,
    };
  }

  const isMobileUA = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const isMobileViewport =
    window.matchMedia("(max-width: 820px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  const isMobile = isMobileUA || isMobileViewport;

  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let quality: QualityTier = "high";
  if (isMobile || cores <= 4) {
    quality = "low";
  } else if (cores <= 6) {
    quality = "medium";
  } else {
    quality = "high";
  }

  // Low-RAM machines: never run full high tier
  if (mem !== undefined && mem <= 4 && quality === "high") {
    quality = "medium";
  }

  // Reduced motion: keep effects lighter (post still runs via medium, not off)
  if (reducedMotion && quality === "high") {
    quality = "medium";
  }

  return {
    quality,
    isMobile,
    reducedMotion,
    shadows: quality !== "low",
    cores,
  };
}

/** @deprecated alias — use detectAutoQuality */
export function detectQualityTier(): AutoQualityResult {
  return detectAutoQuality();
}

export function dprForQuality(q: QualityTier): [number, number] {
  switch (q) {
    case "low":
      return [1, 1.1];
    case "medium":
      return [1, 1.35];
    default:
      return [1, 1.75];
  }
}

/**
 * Map scene tier + reduced-motion flag → Atmosphere quality prop.
 * reducedMotion fully disables the post stack.
 */
export function atmosphereQualityFor(
  quality: QualityTier,
  reducedMotion: boolean
): QualityPreset {
  if (reducedMotion) return "off";
  return quality;
}

/**
 * Local-state auto quality (matches the simple useState + useEffect pattern).
 * Prefer `useApplyAutoQuality` when driving useSceneStore instead.
 */
export function useAutoQuality(
  initial: QualityPreset = "high"
): [QualityPreset, (q: QualityPreset) => void] {
  const [quality, setQuality] = useState<QualityPreset>(initial);

  useEffect(() => {
    const detected = detectAutoQuality();
    setQuality(detected.reducedMotion ? "off" : detected.quality);
  }, []);

  return [quality, setQuality];
}

export type AutoQualityPreferences = {
  quality: QualityTier;
  shadows: boolean;
  reducedMotion: boolean;
  autoRotate?: boolean;
};

/**
 * Apply automatic quality detection into a preferences setter (e.g. scene store).
 * Also listens for prefers-reduced-motion changes.
 */
export function useApplyAutoQuality(
  setPreferences: (patch: AutoQualityPreferences) => void
): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const detected = detectAutoQuality();
      const patch: AutoQualityPreferences = {
        quality: detected.quality,
        shadows: detected.shadows,
        reducedMotion: detected.reducedMotion,
      };
      if (detected.reducedMotion) patch.autoRotate = false;
      setPreferences(patch);
    };

    apply();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => apply();
    mq.addEventListener("change", onMotion);
    return () => mq.removeEventListener("change", onMotion);
  }, [setPreferences]);
}
