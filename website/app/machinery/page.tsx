import { Machinery, fetchPublic } from "../../lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Machinery & Brochures — clawSW",
  description: "Our machinery range with downloadable brochures.",
};

export default async function MachineryPage() {
  const machines = await fetchPublic<Machinery[]>("/machinery");
  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Machinery</h1>
      {machines === null ? (
        <p style={{ color: "#64748b" }}>
          The machinery list is temporarily unavailable. Please try again
          shortly.
        </p>
      ) : machines.length === 0 ? (
        <p style={{ color: "#64748b" }}>No machinery published yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {machines.map((m) => (
            <div
              key={m.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.125rem" }}>
                {m.name}
              </h2>
              {m.category && (
                <div style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                  {m.category}
                </div>
              )}
              {m.brochure_path ? (
                <a
                  href={m.brochure_path}
                  style={{
                    display: "inline-block",
                    marginTop: "0.75rem",
                    color: "#0f172a",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  Download brochure →
                </a>
              ) : (
                <div
                  style={{
                    marginTop: "0.75rem",
                    color: "#94a3b8",
                    fontSize: "0.875rem",
                  }}
                >
                  Brochure on request
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
