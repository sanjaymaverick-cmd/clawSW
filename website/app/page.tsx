import Link from "next/link";

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "1.5rem",
  textDecoration: "none",
  color: "#0f172a",
  display: "block",
};

export default function Home() {
  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <section style={{ textAlign: "center", padding: "3rem 0" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>clawSW</h1>
        <p style={{ fontSize: "1.125rem", color: "#475569" }}>
          Industrial machinery, genuine spares &amp; tools, and expert service.
        </p>
      </section>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <Link href="/catalog" style={card}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>
            Spares &amp; Tools Catalog
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
            Browse genuine spares and tools, check availability, and place an
            order online.
          </p>
        </Link>
        <Link href="/machinery" style={card}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>
            Machinery &amp; Brochures
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
            Explore our machinery range and download product brochures.
          </p>
        </Link>
        <Link href="/projects" style={card}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>
            Completed Projects
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
            A gallery of installations and overhauls we have delivered.
          </p>
        </Link>
        <Link href="/book-demo" style={card}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>
            Book a Demo
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
            See a machine in action — pick a date and we will get in touch.
          </p>
        </Link>
      </section>
    </main>
  );
}
