/**
 * Hero3D module public surface.
 * Prefer importing the default from `../Hero3D` in pages.
 */

export { createWoodProximityMaterial, syncProximityUniforms } from "./WoodProximityMaterial";
export type {
  WoodProximityMaterial,
  WoodProximityUniforms,
  CreateWoodProximityOptions,
} from "./WoodProximityMaterial";
export { BLADE, WOOD_COLORS, GLOW, COUNTS, ORBIT, CAMERA, PARALLAX } from "./config";
