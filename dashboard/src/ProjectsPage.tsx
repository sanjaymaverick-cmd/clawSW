import { useCallback, useEffect, useState } from "react";
import { api, ApiError, ProjectRow } from "./api";
import { Badge, Button, Card } from "./ui";
import { formatInr } from "./lib/money";

const STAGES = ["Quote", "Split Fulfilment", "Container Tracking", "Delivery & Install", "Closed"];

export default function ProjectsPage({
  token,
  canWrite,
}: {
  token: string;
  canWrite: boolean;
}) {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    customer_name: "",
    city: "",
    stage: "Quote",
    boq_value: "",
    margin_pct: "",
  });

  const refresh = useCallback(async () => {
    try {
      setRows(await api.listProjects(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load projects");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      {error && <p className="staff-alert staff-alert-error">{error}</p>}
      <Card title="Turnkey projects">
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: 0 }}>
          Operational project pipeline with BOQ value and projected margin (distinct from marketing gallery).
        </p>
        <div className="space-y-3">
          {rows.map((p) => (
            <article
              key={p.id}
              className="staff-card"
              style={{ background: "var(--bg-2)", boxShadow: "none", padding: 14 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.customer_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--dim)" }}>
                    {p.code} · {p.city ?? "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "var(--wood)" }}>{formatInr(p.boq_value)}</div>
                  <Badge tone={p.margin_pct < 16 ? "warn" : "ok"}>{p.margin_pct}% margin</Badge>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STAGES.map((s) => (
                  <span
                    key={s}
                    className="staff-badge"
                    style={{
                      background: s === p.stage ? "rgba(224,164,90,0.2)" : "transparent",
                      color: s === p.stage ? "var(--wood)" : "var(--dim)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {rows.length === 0 && <p style={{ color: "var(--dim)" }}>No projects yet.</p>}
        </div>
      </Card>

      {canWrite && (
        <Card title="New project">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createProject(token, {
                  code: form.code,
                  customer_name: form.customer_name,
                  city: form.city || null,
                  stage: form.stage,
                  boq_value: Number(form.boq_value) || 0,
                  margin_pct: Number(form.margin_pct) || 0,
                  status: "active",
                });
                setForm({ code: "", customer_name: "", city: "", stage: "Quote", boq_value: "", margin_pct: "" });
                await refresh();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Create failed");
              }
            }}
          >
            <input className="staff-input" required placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="staff-input" required placeholder="Customer" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input className="staff-input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <select className="staff-select" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input className="staff-input" placeholder="BOQ value" value={form.boq_value} onChange={(e) => setForm({ ...form, boq_value: e.target.value })} />
            <input className="staff-input" placeholder="Margin %" value={form.margin_pct} onChange={(e) => setForm({ ...form, margin_pct: e.target.value })} />
            <Button type="submit" variant="primary">
              Create
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
