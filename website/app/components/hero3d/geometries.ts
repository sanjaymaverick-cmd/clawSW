/**
 * Procedural hero geometries.
 * Swap these for GLTF assets later without touching scene logic:
 *   - load blade.glb → replace createHexSawBladeGeometry()
 *   - load plank/chip/shard meshes → replace createWoodGeometries()
 */

import * as THREE from "three";

/** Industrial hexagonal saw blade with serrated rim + arbor bore. */
export function createHexSawBladeGeometry(): THREE.BufferGeometry {
  const outerR = 1.92;
  const innerR = 0.32;
  const thickness = 0.055;
  const sides = 6;
  const teethPerSide = 6;

  const shape = new THREE.Shape();
  const totalTeeth = sides * teethPerSide;
  const step = (Math.PI * 2) / totalTeeth;
  // Slight hex modulation: radius dips between flat midpoints.
  const hexMod = (a: number) => {
    const local = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
    // 0 at vertex, peak at flat centre → softer hex silhouette
    const t = Math.abs(local - Math.PI / 6) / (Math.PI / 6);
    return THREE.MathUtils.lerp(1.0, 0.94, t * t);
  };

  for (let i = 0; i <= totalTeeth; i++) {
    const a = i * step - Math.PI / 2;
    const tip = i % 2 === 0;
    const baseR = outerR * hexMod(a);
    const r = tip ? baseR : baseR * 0.9;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  // Arbor hole
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 3,
  });

  // Shape is in XY → disc faces the camera (+Z). Centre on origin.
  geo.center();
  // Planar UV for disc face so steel radial brush maps correctly
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const maxR = Math.max(
    Math.abs(bb.max.x),
    Math.abs(bb.max.y),
    Math.abs(bb.min.x),
    Math.abs(bb.min.y)
  );
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, x / (maxR * 2) + 0.5, y / (maxR * 2) + 0.5);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Thin hub / flange ring that sits at the arbor (axis along Z for face-on blade). */
export function createBladeHubGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24, 1, false);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export type WoodGeomSet = {
  plank: THREE.BufferGeometry;
  chip: THREE.BufferGeometry;
  shard: THREE.BufferGeometry;
};

/** Three distinct wood piece types for separate InstancedMesh arrays. */
export function createWoodGeometries(): WoodGeomSet {
  // Higher segment counts give grain normals something to catch
  // Planks — long billets of timber (length along Y for grain UV)
  const plank = new THREE.BoxGeometry(0.14, 0.62, 0.2, 1, 1, 1);

  // Chips — small blocky cut-offs
  const chip = new THREE.BoxGeometry(0.2, 0.1, 0.14, 1, 1, 1);

  // Shards — elongated fragments (machining dust scale)
  const shard = new THREE.ConeGeometry(0.055, 0.24, 4, 1);
  shard.rotateZ(Math.PI * 0.12);

  return { plank, chip, shard };
}

/** Lightweight tetra for ambient dust (Points uses positions only). */
export function createDustPositions(count: number, radius = 5.5): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = radius * (0.35 + Math.random() * 0.65);
    const y = (Math.random() - 0.5) * 4.2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.85;
  }
  return pos;
}
