# Hero3D assets (CC0)

Photoreal stack for the homepage 3D hero.

## Layout

```text
hero3d/
  textures/            1024 WebP PBR (desktop)
    wood-walnut/       albedo.webp, normal.webp, roughness.webp
    wood-oak/
    wood-teak/
    steel/             + metalness.webp
    floor/             albedo.webp only
  models/
    saw-blade.glb
  hdri/
    workshop-1k.hdr    Poly Haven machine_shop_02 @ 1K
  *.jpg                lighter Imagine fallbacks (mobile)
```

## Payload budget

| Tier | Approx size |
|------|-------------|
| Desktop (textures + 1K HDRI + GLB) | **~3.4 MB** |
| Mobile root JPGs | ~3.1 MB |

Target for desktop was &lt; 8–12 MB.

## Sources & licenses

| Asset | Source | License |
|--------|--------|---------|
| Wood051, Wood027, Wood048 | [ambientCG](https://ambientcg.com) | CC0 |
| Metal032, Concrete034 | ambientCG | CC0 |
| machine_shop_02 (as `workshop-1k.hdr`) | [Poly Haven](https://polyhaven.com/a/machine_shop_02) | CC0 |
| saw-blade.glb | Generated from scene geometry (`scripts/export-saw-blade.mjs`) | Project |

## Regenerating

```bash
# From website/
# 1) Place source 2K JPGs next to WebP paths (e.g. textures/wood-oak/albedo.jpg)
# 2) Re-export 1024 WebP
npm i -D sharp
node scripts/optimize-hero3d.mjs

# Re-export blade GLB
node scripts/export-saw-blade.mjs

# HDRI: download 1K from Poly Haven if needed
# https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/machine_shop_02_1k.hdr
# → public/hero3d/hdri/workshop-1k.hdr
```

## Quality tiers

- **Desktop:** 1024 WebP PBR + 1K HDRI + GLB blade
- **Mobile:** lighter Imagine JPGs + RoomEnvironment (no HDRI decode)

## Replacing assets

Keep filenames the same, or update paths in `app/components/hero3d/textures.ts`.
Prefer seamless 1024 WebP; only go 2K if desktop payload budget allows.
