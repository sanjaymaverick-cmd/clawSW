# Hero3D assets (CC0)

Photoreal stack for the homepage 3D hero.

## Layout

```text
hero3d/
  textures/
    wood-walnut/   albedo.jpg, normal.jpg, roughness.jpg   (2K)
    wood-oak/
    wood-teak/
    steel/         + metalness.jpg
    floor/
  models/
    saw-blade.glb
  hdri/
    workshop-2k.hdr
  *.jpg            lighter Imagine fallbacks (mobile)
```

## Sources & licenses

| Asset | Source | License |
|--------|--------|---------|
| Wood051, Wood027, Wood048 | [ambientCG](https://ambientcg.com) | CC0 |
| Metal032, Concrete034 | ambientCG | CC0 |
| machine_shop_02 (as `workshop-2k.hdr`) | [Poly Haven](https://polyhaven.com/a/machine_shop_02) | CC0 |
| saw-blade.glb | Generated from scene geometry (`scripts/export-saw-blade.mjs`) | Project |

## Regenerating

```bash
# Re-export blade GLB
node scripts/export-saw-blade.mjs

# Optional: re-download packs (see plan / ambientcg get?file=… URLs)
```

## Quality tiers

- **Desktop:** 2K JPG PBR + 2K HDRI + GLB blade
- **Mobile:** lighter Imagine JPGs + RoomEnvironment (no HDRI decode)

## Replacing assets

Keep filenames the same, or update paths in `app/components/hero3d/textures.ts`.
Prefer seamless 2K WebP for production bandwidth; 4K only if desktop payload budget allows.
