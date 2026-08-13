# AR assets

Place simplified machine meshes here for mobile AR:

- `{machine-slug}.glb` — Android Scene Viewer / desktop download
- `{machine-slug}.usdz` — iOS Quick Look (`rel="ar"`)

Wire paths on the machine record:

```ts
glbUrl: "/models/ar/beam-saw-bs-2700.glb"
```

Keep meshes under ~5–15k tris and 1–2K textures for mobile AR performance.

Demo: `/hero3d/models/saw-blade.glb` is temporarily linked on Beam Saw BS-2700.
