import { CompletedProject, fetchPublic } from "../../lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Completed Projects — clawSW",
  description: "Installations and overhauls delivered by clawSW.",
};

export default async function ProjectsPage() {
  const projects = await fetchPublic<CompletedProject[]>("/projects");
  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Completed Projects</h1>
      {projects === null ? (
        <p style={{ color: "#64748b" }}>
          The gallery is temporarily unavailable. Please try again shortly.
        </p>
      ) : projects.length === 0 ? (
        <p style={{ color: "#64748b" }}>No projects published yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {projects.map((p) => (
            <article
              key={p.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem" }}>
                {p.title}
              </h2>
              <div style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                {[p.client_name, p.date_completed].filter(Boolean).join(" · ")}
              </div>
              {p.description && (
                <p style={{ color: "#475569", margin: "0.75rem 0 0" }}>
                  {p.description}
                </p>
              )}
              {p.image_paths && p.image_paths.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginTop: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  {p.image_paths.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt={p.title}
                      style={{
                        width: 200,
                        maxWidth: "100%",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
