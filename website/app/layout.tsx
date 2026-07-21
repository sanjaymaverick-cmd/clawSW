import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "clawSW — Machinery, Spares & Service",
  description:
    "Industrial machinery sales, genuine spares and tools, and on-site service.",
};

const navLink: React.CSSProperties = {
  color: "#0f172a",
  textDecoration: "none",
  fontSize: "0.9375rem",
  fontWeight: 500,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <nav
            style={{
              maxWidth: 1040,
              margin: "0 auto",
              padding: "1rem 1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{ ...navLink, fontSize: "1.25rem", fontWeight: 700 }}
            >
              clawSW
            </Link>
            <div style={{ flex: 1 }} />
            <Link href="/catalog" style={navLink}>
              Spares &amp; Tools
            </Link>
            <Link href="/machinery" style={navLink}>
              Machinery
            </Link>
            <Link href="/projects" style={navLink}>
              Projects
            </Link>
            <Link
              href="/book-demo"
              style={{
                ...navLink,
                background: "#0f172a",
                color: "#ffffff",
                padding: "0.5rem 1rem",
                borderRadius: 8,
              }}
            >
              Book a Demo
            </Link>
          </nav>
        </header>
        <div style={{ flex: 1 }}>{children}</div>
        <footer
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "1.5rem",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.8125rem",
          }}
        >
          © {new Date().getFullYear()} clawSW — machinery, genuine spares
          &amp; expert service.
        </footer>
      </body>
    </html>
  );
}
