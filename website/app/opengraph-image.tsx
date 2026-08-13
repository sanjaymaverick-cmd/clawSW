import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sanjay Wood Tech — Woodworking Machinery, Spares & Service";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0b0d 0%, #14171c 100%)",
          padding: "72px 80px",
          color: "#f3f1ec",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#e0a45a",
              color: "#0a0b0d",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            SW
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            Sanjay Wood Tech
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            Woodworking machinery, sourced &amp; commissioned.
          </div>
          <div style={{ fontSize: 30, color: "#a7aeb8", maxWidth: 880 }}>
            Panel processing · Solid wood · Taiwan range · Veneer lines —
            direct import &amp; pan-India service.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 24, color: "#e0a45a" }}>
          <span>Jodhpur, India</span>
          <span style={{ color: "#3a3f47" }}>|</span>
          <span style={{ color: "#a7aeb8" }}>sanjaywoodtech.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
