/** Shared library barrel — design tokens, content, and 3D stores. */
export { colors, radii, spacing, scene } from "./design-tokens";
export type { DesignColor } from "./design-tokens";
export {
  detectAutoQuality,
  detectQualityTier,
  dprForQuality,
  atmosphereQualityFor,
  useAutoQuality,
  useApplyAutoQuality,
} from "./quality";
export type {
  QualityTier,
  QualityPreset,
  AutoQualityResult,
} from "./quality";
