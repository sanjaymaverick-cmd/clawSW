import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — Sanjay Wood Tech",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section
      className="container"
      style={{
        minHeight: "62vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 22,
        paddingBlock: "clamp(64px, 12vw, 140px)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--wood)",
        }}
      >
        404
      </span>
      <h1
        style={{
          fontFamily: "var(--font-sora), sans-serif",
          fontSize: "clamp(2rem, 5vw, 3.4rem)",
          fontWeight: 700,
          lineHeight: 1.05,
          maxWidth: "16ch",
        }}
      >
        That machine isn&rsquo;t on the floor.
      </h1>
      <p className="muted" style={{ maxWidth: "48ch", fontSize: "1.05rem" }}>
        The page you were after has moved or never existed. Browse the full
        machinery range, or tell us what you&rsquo;re looking for.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <Link href="/machinery" className="btn btn-wood" style={{ padding: "12px 22px" }}>
          Browse machinery
        </Link>
        <Link
          href="/contact"
          className="btn"
          style={{
            padding: "12px 22px",
            border: "1px solid var(--border-strong)",
            color: "var(--text)",
          }}
        >
          Contact us
        </Link>
      </div>
    </section>
  );
}
