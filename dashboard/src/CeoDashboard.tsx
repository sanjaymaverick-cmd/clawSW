import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, CeoSnapshot } from "./api";
import { Badge, Button, Card } from "./ui";
import { formatInr } from "./lib/money";
import {
  SUGGESTED_QUESTIONS,
  askLocalCeo,
  buildAttentionFeed,
  buildMorningBrief,
  type LocalAiAnswer,
} from "./lib/ceoLocalAi";

type NavigateTab =
  | "dashboard"
  | "overview"
  | "inventory"
  | "service"
  | "invoicing"
  | "website"
  | "users"
  | "audit"
  | "imports"
  | "projects";

function healthTone(score: number): "ok" | "warn" | "danger" | "wood" {
  if (score >= 75) return "ok";
  if (score >= 50) return "wood";
  if (score >= 30) return "warn";
  return "danger";
}

function severityTone(s: string): "ok" | "warn" | "danger" | "info" | "neutral" {
  if (s === "critical" || s === "high") return "danger";
  if (s === "medium") return "warn";
  if (s === "low") return "ok";
  return "neutral";
}

function SparkBars({ values, color = "var(--wood)" }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 56, width: "100%" }} aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 4,
            height: `${Math.max(6, (v / max) * 100)}%`,
            borderRadius: 3,
            background: `linear-gradient(180deg, ${color}, transparent)`,
            opacity: 0.35 + (v / max) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="staff-stat" style={{ minHeight: 96 }}>
      <p className="staff-stat-label">{label}</p>
      <p className="staff-stat-value" style={{ color: accent || "var(--text)", fontSize: "1.25rem" }}>
        {value}
      </p>
      {hint && <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "var(--dim)" }}>{hint}</p>}
    </div>
  );
}

export default function CeoDashboard({
  token,
  onNavigate,
}: {
  token: string;
  onNavigate?: (tab: NavigateTab) => void;
}) {
  const [snap, setSnap] = useState<CeoSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [chat, setChat] = useState<{ role: "user" | "ai"; title?: string; text: string }[]>([
    {
      role: "ai",
      title: "Local Command Center",
      text: "Ask in plain language. Answers use live CEO aggregates — no paid API required. Cloud brief is optional below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudNote, setCloudNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.reportCeo(token);
      setSnap(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load CEO dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const brief = useMemo(() => (snap ? buildMorningBrief(snap) : []), [snap]);
  const attention = useMemo(() => (snap ? buildAttentionFeed(snap) : []), [snap]);
  const gmvSeries = useMemo(() => (snap?.series_14d ?? []).map((d) => d.website_gmv), [snap]);
  const orderSeries = useMemo(() => (snap?.series_14d ?? []).map((d) => d.website_orders), [snap]);
  const jobSeries = useMemo(() => (snap?.series_14d ?? []).map((d) => d.service_jobs_opened), [snap]);

  const askLocal = (q: string) => {
    if (!snap || !q.trim()) return;
    const answer: LocalAiAnswer = askLocalCeo(q.trim(), snap);
    setChat((c) => [...c, { role: "user", text: q.trim() }, { role: "ai", title: answer.title, text: answer.text }]);
    setInput("");
  };

  const cloudBrief = async () => {
    setCloudBusy(true);
    setCloudNote(null);
    try {
      const res = await api.aiQuery(token, {
        question:
          "Give a concise CEO executive brief on inventory, service, website orders and financial aggregates. Highlight risks and 3 actions.",
        include_financial: true,
      });
      setChat((c) => [
        ...c,
        { role: "user", text: "Cloud executive brief" },
        { role: "ai", title: "Cloud AI brief", text: res.answer },
      ]);
      setCloudNote(`Used: ${res.resources_used.join(", ")}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setCloudNote("Cloud AI not configured — use Local Command Center chips (free).");
      } else {
        setCloudNote(err instanceof ApiError ? err.message : "Cloud AI failed");
      }
    } finally {
      setCloudBusy(false);
    }
  };

  if (loading && !snap) {
    return <p style={{ fontSize: "0.875rem", color: "var(--dim)" }}>Loading CEO dashboard…</p>;
  }
  if (error && !snap) {
    return <p className="staff-alert staff-alert-error">{error}</p>;
  }
  if (!snap) return null;

  const { financial: f, operational: o, health_score: health } = snap;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section
        className="staff-card"
        style={{
          background:
            "radial-gradient(80% 120% at 0% 0%, rgba(224,164,90,0.14), transparent 55%), linear-gradient(180deg, var(--surface-2), var(--surface))",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--wood)" }}>
            Owner · CEO command center
          </p>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Business performance overview
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "0.875rem", color: "var(--muted)", maxWidth: 560 }}>
            Local intelligence by default — metrics, risks, morning brief, and Q&A without a paid model.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <Badge tone={healthTone(health)}>Health {health}/100</Badge>
          <Badge tone={snap.tally.gateway_reachable ? "ok" : "warn"}>
            Tally {snap.tally.gateway_reachable ? "online" : "offline"}
          </Badge>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
              {lastRefresh ? `As of ${lastRefresh.toLocaleTimeString()}` : "—"}
            </span>
            <Button onClick={() => void refresh()} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Morning brief */}
      <section className="staff-card">
        <h2 className="staff-card-title" style={{ marginTop: 0 }}>
          Morning briefing
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.65 }}>
          {brief.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      {/* Attention inbox */}
      <section>
        <h2 className="ceo-section-title">Needs attention</h2>
        <div className="space-y-2">
          {attention.length === 0 && (
            <p style={{ color: "var(--dim)", fontSize: "0.875rem" }}>Nothing critical right now.</p>
          )}
          {attention.map((a) => (
            <button
              key={a.id}
              type="button"
              className="attention-card"
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => a.hrefTab && onNavigate?.(a.hrefTab as NavigateTab)}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
                <span style={{ fontSize: "0.72rem", color: "var(--dim)", textTransform: "uppercase" }}>
                  {a.category}
                </span>
              </div>
              <div className="attention-card-value" style={{ fontSize: "1rem", marginTop: 6 }}>
                {a.title}
              </div>
              <div className="attention-card-desc">{a.detail}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Financial */}
      <section>
        <h2 className="ceo-section-title">Core financial metrics</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Stock capital" value={formatInr(f.stock_capital)} hint={`Main ${formatInr(o.stock_main_value ?? 0)} · Van ${formatInr(o.stock_van_value ?? 0)}`} accent="var(--wood)" />
          <MetricTile label="Website GMV (30d)" value={formatInr(f.website_gmv_30d)} hint={`7d ${formatInr(f.website_gmv_7d)}`} />
          <MetricTile label="Order pipeline" value={formatInr(f.pipeline_value)} hint={`Pending ${formatInr(f.pending_order_value)}`} accent="var(--info)" />
          <MetricTile label="Billed service parts" value={formatInr(f.billed_parts_value)} hint={`${f.billed_jobs} billed job(s)`} />
        </div>
      </section>

      {/* Ops KPIs */}
      <section>
        <h2 className="ceo-section-title">Operational & growth KPIs</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <MetricTile label="Active service jobs" value={String(o.open_service_jobs + o.in_progress_jobs)} hint={`${o.open_service_jobs} open · ${o.in_progress_jobs} in progress`} />
          <MetricTile label="Completion rate" value={o.service_completion_rate_pct != null ? `${o.service_completion_rate_pct}%` : "—"} hint={o.avg_completion_hours != null ? `Avg ${o.avg_completion_hours}h` : undefined} />
          <MetricTile label="Website orders (30d)" value={String(o.website_orders_30d)} hint={`${o.website_orders_pending} pending`} />
          <MetricTile label="Demos pending" value={String(o.demo_bookings_pending)} />
          <MetricTile label="Low-stock SKUs" value={String(o.low_stock_skus)} hint={o.van_low_stock_skus ? `Van low: ${o.van_low_stock_skus}` : "Main + all locations"} />
          <MetricTile label="Stock moves (7d)" value={String(o.stock_moves_7d)} />
          <MetricTile label="Parts used value" value={formatInr(o.parts_used_value)} />
          <MetricTile label="Active users" value={String(o.active_users)} />
        </div>
      </section>

      {/* Receivables / imports / projects */}
      <section className="grid gap-3 md:grid-cols-3">
        {snap.receivables && (
          <Card title="Receivables aging">
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "var(--warn)" }}>
              {formatInr(snap.receivables.overdue_total)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--dim)" }}>
              {snap.receivables.overdue_count} overdue · 0–30 {formatInr(snap.receivables.bucket_0_30)} · 31–60{" "}
              {formatInr(snap.receivables.bucket_31_60)} · 60+ {formatInr(snap.receivables.bucket_60_plus)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--dim)", fontStyle: "italic" }}>
              Inferred from aged website orders — not a Tally ledger balance.
            </p>
            <Button style={{ marginTop: 12, fontSize: "0.8rem" }} onClick={() => onNavigate?.("invoicing")}>
              Open invoicing
            </Button>
          </Card>
        )}
        {snap.imports && (
          <Card title="Import containers">
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>{snap.imports.total} tracked</p>
            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--dim)" }}>
              {snap.imports.delayed_or_hold} delayed/hold · at risk {formatInr(snap.imports.value_at_risk)} · on water{" "}
              {snap.imports.on_water}
            </p>
            <Button style={{ marginTop: 12, fontSize: "0.8rem" }} onClick={() => onNavigate?.("imports")}>
              Open imports
            </Button>
          </Card>
        )}
        {snap.projects && (
          <Card title="Turnkey projects">
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>{snap.projects.active_count} active</p>
            <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--dim)" }}>
              BOQ pipeline {formatInr(snap.projects.pipeline_boq_value)}
              {snap.projects.lowest_margin_pct != null
                ? ` · lowest margin ${snap.projects.lowest_margin_pct}% (${snap.projects.lowest_margin_customer})`
                : ""}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--dim)", fontStyle: "italic" }}>
              Margin is entered per project — no line-item costing yet.
            </p>
            <Button style={{ marginTop: 12, fontSize: "0.8rem" }} onClick={() => onNavigate?.("projects")}>
              Open projects
            </Button>
          </Card>
        )}
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Website GMV · 14 days">
          <SparkBars values={gmvSeries} />
        </Card>
        <Card title="Orders · 14 days">
          <SparkBars values={orderSeries} color="var(--info)" />
        </Card>
        <Card title="Service intake · 14 days">
          <SparkBars values={jobSeries} color="var(--ok)" />
        </Card>
      </section>

      {/* Predictions + maintenance */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="ceo-section-title">Run-rate outlook</h2>
          <p style={{ margin: "-4px 0 10px", fontSize: "0.78rem", color: "var(--dim)" }}>
            Simple extrapolation from current data — a sketch, not a forecast.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {snap.predictions.map((p) => (
              <div key={p.id} className="staff-card">
                <p className="staff-stat-label">{p.horizon}</p>
                <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: "0.9rem" }}>{p.title}</p>
                <p style={{ margin: "8px 0 0", fontSize: "1.15rem", fontWeight: 700, color: "var(--wood)" }}>
                  {p.estimate.includes("₹") ? p.estimate : p.estimate}
                </p>
                <Badge tone={p.confidence === "high" ? "ok" : "wood"}>{p.confidence}</Badge>
              </div>
            ))}
          </div>
        </div>
        {snap.maintenance && (
          <div>
            <h2 className="ceo-section-title">Machine risk (rule-based)</h2>
            <Card title={`${snap.maintenance.elevated_count} elevated`}>
              {snap.maintenance.top_risks.length === 0 && (
                <p style={{ margin: 0, color: "var(--dim)", fontSize: "0.875rem" }}>No elevated machines.</p>
              )}
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.875rem", color: "var(--muted)" }}>
                {snap.maintenance.top_risks.map((t) => (
                  <li key={t.machinery_id} style={{ marginBottom: 6 }}>
                    <strong style={{ color: "var(--text)" }}>{t.name}</strong> — {t.risk_score}/100 ({t.reason})
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </section>

      {/* Service map */}
      {snap.service_map && snap.service_map.length > 0 && (
        <section>
          <h2 className="ceo-section-title">Service footprint</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {snap.service_map.map((c) => (
              <div key={c.city} className="staff-stat">
                <p className="staff-stat-label">{c.type}</p>
                <p className="staff-stat-value" style={{ fontSize: "1.2rem" }}>
                  {c.city}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--dim)" }}>
                  {c.open_jobs} open job(s)
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Local Command Center */}
      <section className="staff-card">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <h2 className="staff-card-title" style={{ margin: 0 }}>
              Local Command Center
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
              Free keyword intelligence over live aggregates — no Anthropic required.
            </p>
          </div>
          <Button variant="ghost" disabled={cloudBusy} onClick={() => void cloudBrief()} style={{ fontSize: "0.8rem" }}>
            {cloudBusy ? "Cloud…" : "Optional cloud brief"}
          </Button>
        </div>
        {cloudNote && <p style={{ fontSize: "0.8rem", color: "var(--dim)" }}>{cloudNote}</p>}
        <div
          style={{
            maxHeight: 280,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
          }}
        >
          {chat.map((m, i) =>
            m.role === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", background: "rgba(224,164,90,0.15)", padding: "8px 12px", borderRadius: 10, fontSize: "0.875rem", maxWidth: "85%" }}>
                {m.text}
              </div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
                {m.title && <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--wood)" }}>{m.title}</strong>}
                <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "var(--muted)", whiteSpace: "pre-wrap" }}>{m.text}</p>
              </div>
            ),
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className="staff-btn"
              style={{ fontSize: "0.75rem", padding: "6px 10px" }}
              onClick={() => askLocal(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <form
          style={{ display: "flex", gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            askLocal(input);
          }}
        >
          <input
            className="staff-input"
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about stock, service, pipeline, Tally, imports…"
            aria-label="Ask local AI"
          />
          <Button type="submit" variant="primary">
            Ask
          </Button>
        </form>
      </section>

      {/* Shortcuts */}
      <section>
        <h2 className="ceo-section-title">Jump to module</h2>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          {(
            [
              ["inventory", "Inventory"],
              ["service", "Service"],
              ["website", "Website orders"],
              ["invoicing", "Invoicing"],
              ["imports", "Imports"],
              ["projects", "Projects"],
            ] as [NavigateTab, string][]
          ).map(([tab, label]) => (
            <button key={tab} type="button" className="attention-card" onClick={() => onNavigate?.(tab)}>
              <span className="attention-card-value" style={{ fontSize: "1rem" }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <style>{`
        .ceo-section-title {
          margin: 0 0 12px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--dim);
        }
      `}</style>
    </div>
  );
}
