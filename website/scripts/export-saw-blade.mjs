/**
 * Export procedural industrial hex saw blade as GLTF for Hero3D.
 * Run: node scripts/export-saw-blade.mjs
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Blob } from "buffer";

// GLTFExporter expects browser FileReader/Blob
globalThis.Blob = Blob;
globalThis.FileReader = class FileReader {
  constructor() {
    this.onload = null;
    this.onloadend = null;
    this.onerror = null;
    this.result = null;
    this.readyState = 0;
  }
  readAsArrayBuffer(blob) {
    this.readyState = 1;
    const finish = (buf) => {
      this.readyState = 2;
      this.result = buf;
      const ev = { target: this };
      queueMicrotask(() => {
        this.onload && this.onload(ev);
        this.onloadend && this.onloadend(ev);
      });
    };
    if (blob && typeof blob.arrayBuffer === "function") {
      blob.arrayBuffer().then(finish).catch((e) => this.onerror && this.onerror(e));
    } else {
      finish(blob);
    }
  }
  readAsDataURL(blob) {
    this.readyState = 1;
    const toB64 = async () => {
      const buf = Buffer.from(await blob.arrayBuffer());
      this.readyState = 2;
      this.result = `data:application/octet-stream;base64,${buf.toString("base64")}`;
      const ev = { target: this };
      this.onload && this.onload(ev);
      this.onloadend && this.onloadend(ev);
    };
    toB64().catch((e) => this.onerror && this.onerror(e));
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/hero3d/models");

function createHexSawBladeGeometry() {
  const outerR = 1.92;
  const innerR = 0.32;
  const thickness = 0.055;
  const sides = 6;
  const teethPerSide = 6;
  const shape = new THREE.Shape();
  const totalTeeth = sides * teethPerSide;
  const step = (Math.PI * 2) / totalTeeth;
  const hexMod = (a) => {
    const local = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
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
  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const maxR = Math.max(
    Math.abs(bb.max.x),
    Math.abs(bb.max.y),
    Math.abs(bb.min.x),
    Math.abs(bb.min.y)
  );
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / (maxR * 2) + 0.5, pos.getY(i) / (maxR * 2) + 0.5);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function mat(color, metalness = 0.95, roughness = 0.25) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

const scene = new THREE.Scene();
const group = new THREE.Group();
group.name = "SawBlade";

const blade = new THREE.Mesh(createHexSawBladeGeometry(), mat(0x3a4149));
blade.name = "BladeDisc";
group.add(blade);

const hubGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 32);
hubGeo.rotateX(Math.PI / 2);
const hub = new THREE.Mesh(hubGeo, mat(0x1c1f24, 0.9, 0.35));
hub.name = "Hub";
group.add(hub);

const boltGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.15, 16);
boltGeo.rotateX(Math.PI / 2);
const bolt = new THREE.Mesh(boltGeo, mat(0x0e1013));
bolt.name = "ArborBolt";
group.add(bolt);

const hex = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.16, 0.05, 6),
  mat(0x2a3038, 0.92, 0.3)
);
hex.position.z = 0.09;
hex.name = "BoltHead";
group.add(hex);

const rim = new THREE.Mesh(
  new THREE.TorusGeometry(1.85 * 0.985, 0.016, 10, 72),
  mat(0x9aa3ad, 1, 0.12)
);
rim.name = "CuttingRim";
group.add(rim);

scene.add(group);

fs.mkdirSync(outDir, { recursive: true });

const exporter = new GLTFExporter();

await new Promise((resolve, reject) => {
  exporter.parse(
    scene,
    (result) => {
      try {
        if (result instanceof ArrayBuffer) {
          const outPath = path.join(outDir, "saw-blade.glb");
          fs.writeFileSync(outPath, Buffer.from(result));
          console.log(
            "Wrote",
            outPath,
            (result.byteLength / 1024).toFixed(1) + "kb"
          );
        } else {
          const outPath = path.join(outDir, "saw-blade.gltf");
          fs.writeFileSync(outPath, JSON.stringify(result));
          console.log(
            "Wrote",
            outPath,
            (fs.statSync(outPath).size / 1024).toFixed(1) + "kb"
          );
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    },
    (err) => reject(err),
    { binary: true, embedImages: false }
  );
});
