import { useCallback, useEffect, useState } from "react";
import { api, ApiError, ReportSummary } from "./api";
import { Badge, Card } from "./ui";
import CeoDashboard from "./CeoDashboard";

const STATUS_ORDER = ["open", "in_progress", "completed", "billed"] as const;

const STATUS_TONE: Record<string, "neutral" | "info" | "ok" | "wood"> = {
  open: "neutral",
  in_progress: "info",
  completed: "ok",
  billed: "wood",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="staff-stat">
      <p className="staff-stat-label">{label}</p>
      <p className="staff-stat-value">{value}</p>
    </div>
  );
}

type NavigateTab =
  | "dashboard"
  | "overview"
  | "inventory"
  | "service"
  | "invoicing"
  | "website"
  | "imports"
  | "projects"
  | "users"
  | "audit";

export default function DashboardPage({
  token,
  role,
  onNavigate,
}: {
  token: string;
  role?: string;
  onNavigate?: (tab: NavigateTab) => void;
}) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = role === "owner";

  const refresh = useCallback(async () => {
    try {
      setSummary(await api.reportSummary(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
    }
  }, [token]);

  useEffect(() => {
    if (isOwner) return;
    void refresh();
  }, [refresh, isOwner]);

  if (isOwner) {
    return <CeoDashboard token={token} onNavigate={onNavigate} />;
  }

  if (error) {
    return <p className="staff-alert staff-alert-error">{error}</p>;
  }
  if (!summary) {
    return <p style={{ fontSize: "0.875rem", color: "var(--dim)" }}>Loading…</p>;
  }

  const { stock, service, financial, people } = summary;
  const openJobs =
    (service?.jobs_by_status["open"] ?? 0) +
    (service?.jobs_by_status["in_progress"] ?? 0);
  const lowStockCount = stock?.low_stock.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Attention inbox */}
      <section>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          Needs attention
        </h2>
        <div className="attention-grid">
          <button
            type="button"
            className={`attention-card ${lowStockCount > 0 ? "is-warn" : "is-ok"}`}
            onClick={() => onNavigate?.("inventory")}
          >
            <span className="attention-card-kicker">Low stock</span>
            <span className="attention-card-value">{lowStockCount}</span>
            <span className="attention-card-desc">
              {lowStockCount > 0
                ? "SKUs at or below reorder level"
                : "All items above reorder levels"}
            </span>
          </button>

          <button
            type="button"
            className={`attention-card ${openJobs > 0 ? "is-info" : "is-ok"}`}
            onClick={() => onNavigate?.("service")}
          >
            <span className="attention-card-kicker">Open jobs</span>
            <span className="attention-card-value">{openJobs}</span>
            <span className="attention-card-desc">
              Active service tickets needing progress
            </span>
          </button>

          <button
            type="button"
            className="attention-card is-info"
            onClick={() => onNavigate?.("website")}
          >
            <span className="attention-card-kicker">Website orders</span>
            <span className="attention-card-value">→</span>
            <span className="attention-card-desc">
              Review pending spares orders from the public site
            </span>
          </button>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stock && (
          <>
            <Stat label="Items" value={stock.total_items} />
            <Stat
              label="Stock value"
              value={`₹${stock.total_stock_value.toLocaleString()}`}
            />
          </>
        )}
        {service && <Stat label="Open jobs" value={openJobs} />}
        {financial && <Stat label="Billed jobs" value={financial.billed_jobs} />}
        {people && <Stat label="Active users" value={people.active_users} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {stock && (
          <Card title="Low stock">
            {stock.low_stock.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--dim)", margin: 0 }}>
                Nothing at or below its reorder level.
              </p>
            ) : (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>On hand</th>
                    <th style={{ textAlign: "right" }}>Reorder at</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.low_stock.map((row) => (
                    <tr key={row.sku}>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.75rem" }}>
                        {row.sku}
                      </td>
                      <td style={{ color: "var(--text)" }}>{row.name}</td>
                      <td style={{ textAlign: "right" }}>
                        <Badge tone="warn">{row.total_quantity}</Badge>
                      </td>
                      <td style={{ textAlign: "right" }}>{row.reorder_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--dim)", margin: "12px 0 0" }}>
              {stock.moves_last_7_days} stock movements in the last 7 days ·{" "}
              {stock.total_warehouses} warehouse(s)
            </p>
          </Card>
        )}

        {service && (
          <Card title="Service jobs">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {STATUS_ORDER.filter((s) => service.jobs_by_status[s]).map((s) => (
                <Badge key={s} tone={STATUS_TONE[s] ?? "neutral"}>
                  {s.replace("_", " ")}: {service.jobs_by_status[s]}
                </Badge>
              ))}
            </div>
            {service.open_by_technician.length > 0 && (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th style={{ textAlign: "right" }}>Open jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {service.open_by_technician.map((row) => (
                    <tr key={row.technician_name}>
                      <td style={{ color: "var(--text)" }}>{row.technician_name}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--text)" }}>
                        {row.open_jobs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--dim)", margin: "12px 0 0" }}>
              {service.avg_completion_hours !== null &&
                `Avg completion: ${service.avg_completion_hours} h · `}
              Parts used to date: ₹{service.parts_used_value.toLocaleString()}
            </p>
          </Card>
        )}

        {financial && (
          <Card title="Financial (pre-Tally placeholder)">
            <dl style={{ fontSize: "0.875rem", margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <dt style={{ color: "var(--muted)" }}>Billed service jobs</dt>
                <dd style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>
                  {financial.billed_jobs}
                </dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <dt style={{ color: "var(--muted)" }}>Parts value on billed jobs</dt>
                <dd style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>
                  ₹{financial.billed_parts_value.toLocaleString()}
                </dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt style={{ color: "var(--muted)" }}>Current stock valuation</dt>
                <dd style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>
                  ₹{financial.stock_value.toLocaleString()}
                </dd>
              </div>
            </dl>
            <p style={{ fontSize: "0.75rem", color: "var(--dim)", margin: "12px 0 0" }}>
              Real invoicing figures arrive with the Tally sync (Phase 5).
            </p>
          </Card>
        )}

        {people && (
          <Card title="Team">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th style={{ textAlign: "right" }}>Active users</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(people.users_by_role).map(([role, count]) => (
                  <tr key={role}>
                    <td style={{ color: "var(--text)" }}>{role}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--text)" }}>
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
