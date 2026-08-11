/**
 * Capture the floor-planner WebGL canvas as a top-down orthographic snapshot.
 * Temporarily moves the R3F camera, renders one frame, restores state.
 */

import type { Camera, Scene, WebGLRenderer } from "three";
import * as THREE from "three";

export type CaptureOptions = {
  /** Output width in pixels (height derived from room aspect) */
  width?: number;
  /** Optional filename without extension */
  filename?: string;
  /** Room size for aspect (meters) */
  roomWidth: number;
  roomDepth: number;
  /** Padding multiplier above max(room) for framing */
  padding?: number;
};

/**
 * Render a top-down PNG from an existing R3F canvas.
 * Call from a component that has access to gl, scene, camera via useThree().
 */
export function captureTopDownPng(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  opts: CaptureOptions
): string {
  const {
    width = 1920,
    roomWidth,
    roomDepth,
    padding = 1.15,
  } = opts;

  const aspect = roomWidth / Math.max(roomDepth, 0.01);
  const height = Math.round(width / aspect);

  const prevSize = new THREE.Vector2();
  gl.getSize(prevSize);
  const prevPixelRatio = gl.getPixelRatio();

  // Build orthographic camera covering the room
  const halfW = (roomWidth * padding) / 2;
  const halfD = (roomDepth * padding) / 2;
  const ortho = new THREE.OrthographicCamera(
    -halfW,
    halfW,
    halfD,
    -halfD,
    0.1,
    200
  );
  ortho.position.set(0, 40, 0);
  ortho.up.set(0, 0, -1);
  ortho.lookAt(0, 0, 0);
  ortho.updateProjectionMatrix();

  gl.setPixelRatio(1);
  gl.setSize(width, height, false);
  gl.render(scene, ortho);

  const dataUrl = gl.domElement.toDataURL("image/png");

  // Restore
  gl.setPixelRatio(prevPixelRatio);
  gl.setSize(prevSize.x, prevSize.y, false);
  gl.render(scene, camera);

  return dataUrl;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * Minimal single-image PDF (no external deps).
 * Embeds a JPEG of the capture for smaller size.
 */
export async function captureTopDownPdf(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  opts: CaptureOptions
): Promise<Blob> {
  const pngUrl = captureTopDownPng(gl, scene, camera, opts);
  const jpegUrl = await pngDataUrlToJpegDataUrl(pngUrl, 0.92);
  const img = await loadImage(jpegUrl);

  // A4 landscape points (1pt = 1/72")
  const pageW = 842;
  const pageH = 595;
  const margin = 36;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2 - 40;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (pageW - drawW) / 2;
  const y = pageH - margin - 28 - drawH;

  const jpegBytes = dataUrlToUint8Array(jpegUrl);
  const pdf = buildSimpleJpegPdf({
    pageW,
    pageH,
    imgW: img.width,
    imgH: img.height,
    drawX: x,
    drawY: y,
    drawW,
    drawH,
    jpeg: jpegBytes,
    title: opts.filename ?? "Workshop layout",
  });
  return new Blob([pdf.buffer as ArrayBuffer], { type: "application/pdf" });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function pngDataUrlToJpegDataUrl(
  pngDataUrl: string,
  quality: number
): Promise<string> {
  const img = await loadImage(pngDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0b0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Very small PDF writer for a single JPEG image + title. */
function buildSimpleJpegPdf(opts: {
  pageW: number;
  pageH: number;
  imgW: number;
  imgH: number;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
  jpeg: Uint8Array;
  title: string;
}): Uint8Array {
  const encoder = new TextEncoder();
  const objects: Uint8Array[] = [];
  const offsets: number[] = [];

  const push = (content: string | Uint8Array) => {
    const bytes =
      typeof content === "string" ? encoder.encode(content) : content;
    objects.push(bytes);
  };

  // We'll assemble with object numbers 1..n
  const parts: { num: number; data: Uint8Array }[] = [];

  const addObj = (num: number, body: string | Uint8Array) => {
    const header = encoder.encode(`${num} 0 obj\n`);
    const data =
      typeof body === "string" ? encoder.encode(body) : body;
    const end = encoder.encode("\nendobj\n");
    const combined = new Uint8Array(header.length + data.length + end.length);
    combined.set(header, 0);
    combined.set(data, header.length);
    combined.set(end, header.length + data.length);
    parts.push({ num, data: combined });
  };

  // 1: Catalog
  addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  // 2: Pages
  addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  // 3: Page
  addObj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${opts.pageW} ${opts.pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> /Font << /F1 6 0 R >> >> >>`
  );
  // 4: Content stream
  const stream = `BT /F1 14 Tf 36 ${opts.pageH - 28} Td (${escapePdf(
    opts.title
  )}) Tj ET\nq ${opts.drawW} 0 0 ${opts.drawH} ${opts.drawX} ${opts.drawY} cm /Im0 Do Q\n`;
  const streamBytes = encoder.encode(stream);
  addObj(
    4,
    concatBytes(
      encoder.encode(`<< /Length ${streamBytes.length} >>\nstream\n`),
      streamBytes,
      encoder.encode("\nendstream")
    )
  );
  // 5: Image XObject
  addObj(
    5,
    concatBytes(
      encoder.encode(
        `<< /Type /XObject /Subtype /Image /Width ${opts.imgW} /Height ${opts.imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${opts.jpeg.length} >>\nstream\n`
      ),
      opts.jpeg,
      encoder.encode("\nendstream")
    )
  );
  // 6: Font
  addObj(6, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  // Assemble file
  const header = encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  let offset = header.length;
  const bodyParts: Uint8Array[] = [header];
  const xrefOffsets: number[] = [0];

  for (const p of parts) {
    xrefOffsets[p.num] = offset;
    bodyParts.push(p.data);
    offset += p.data.length;
  }

  const xrefStart = offset;
  let xref = `xref\n0 ${parts.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i <= parts.length; i++) {
    xref += `${String(xrefOffsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${parts.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  bodyParts.push(encoder.encode(xref + trailer));
  return concatBytes(...bodyParts);
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrays) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}
