/**
 * Re-export Hero3D desktop textures: 2K JPG → 1024 WebP.
 * Usage (from website/):
 *   npm i -D sharp   # once
 *   node scripts/optimize-hero3d.mjs
 *
 * Expects source JPGs under public/hero3d/textures-src/ (optional archive)
 * or re-runs against any existing JPG next to the WebP paths.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "hero3d");
const SIZE = 1024;

const jobs = [
  ["textures/wood-walnut/albedo", 82],
  ["textures/wood-walnut/normal", 88],
  ["textures/wood-walnut/roughness", 88],
  ["textures/wood-oak/albedo", 82],
  ["textures/wood-oak/normal", 88],
  ["textures/wood-oak/roughness", 88],
  ["textures/wood-teak/albedo", 82],
  ["textures/wood-teak/normal", 88],
  ["textures/wood-teak/roughness", 88],
  ["textures/steel/albedo", 90],
  ["textures/steel/normal", 92],
  ["textures/steel/roughness", 90],
  ["textures/steel/metalness", 90],
  ["textures/floor/albedo", 82],
];

async function convert(rel, quality) {
  const base = path.join(root, rel);
  const srcJpg = base + ".jpg";
  const srcPng = base + ".png";
  const src =
    fs.existsSync(srcJpg) ? srcJpg : fs.existsSync(srcPng) ? srcPng : null;
  if (!src) {
    console.warn("skip (no source):", rel);
    return;
  }
  const dest = base + ".webp";
  await sharp(src)
    .resize(SIZE, SIZE, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(dest);
  const inKb = (fs.statSync(src).size / 1024).toFixed(0);
  const outKb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`${rel}.webp  ${inKb}KB → ${outKb}KB`);
}

for (const [rel, q] of jobs) {
  await convert(rel, q);
}
console.log("Done. Prefer WebP paths in textures.ts; archive/remove source JPGs from public/.");
