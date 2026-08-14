import type { CeoSnapshot } from "../api";
import { formatInr } from "./money";

export type LocalAiAnswer = { title: string; text: string };

export type AttentionItem = {
  id: string;
  severity: string;
  category: string;
  title: string;
  detail: string;
  hrefTab?: "inventory" | "service" | "website" | "invoicing" | "projects" | "imports";
};

const SEV_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildMorningBrief(snap: CeoSnapshot): string[] {
  const o = snap.operational;
  const f = snap.financial;
  const bullets: string[] = [
    `Business health ${snap.health_score}/100.`,
    `Order pipeline ${formatInr(f.pipeline_value)} · website GMV 30d ${formatInr(f.website_gmv_30d)}.`,
    `Service: ${o.open_service_jobs + o.in_progress_jobs} active jobs (${o.open_service_jobs} open / ${o.in_progress_jobs} in progress).`,
    `Website: ${o.website_orders_pending} pending confirm · ${o.demo_bookings_pending} demo booking(s) waiting.`,
    `Tally gateway ${snap.tally.gateway_reachable ? "reachable" : "offline"} · ${snap.tally.failed_push_count} failed push(es) · ${snap.tally.pending_push_count} confirmed awaiting sync.`,
  ];
  const top = [...snap.risks]
    .filter((r) => r.id !== "all-clear")
    .sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9))
    .slice(0, 3);
  for (const r of top) {
    bullets.push(`Risk [${r.severity}] ${r.title}`);
  }
  if (snap.receivables) {
    bullets.push(
      `Receivables overdue ${formatInr(snap.receivables.overdue_total)} across ${snap.receivables.overdue_count} open item(s).`,
    );
  }
  if (snap.imports) {
    bullets.push(
      `Imports: ${snap.imports.delayed_or_hold} container(s) delayed/on hold · ${formatInr(snap.imports.value_at_risk)} at risk.`,
    );
  }
  if (snap.projects) {
    bullets.push(
      `Projects: ${snap.projects.active_count} active · lowest margin ${snap.projects.lowest_margin_pct ?? "—"}%.`,
    );
  }
  return bullets;
}

export function buildAttentionFeed(snap: CeoSnapshot): AttentionItem[] {
  const items: AttentionItem[] = [];
  const seen = new Set<string>();

  for (const r of snap.risks) {
    if (r.id === "all-clear") continue;
    const hrefTab =
      r.category === "inventory"
        ? "inventory"
        : r.category === "service"
          ? "service"
          : r.category === "website"
            ? "website"
            : r.category === "finance"
              ? "invoicing"
              : r.category === "imports"
                ? "imports"
                : r.category === "projects"
                  ? "projects"
                  : undefined;
    items.push({
      id: r.id,
      severity: r.severity,
      category: r.category,
      title: r.title,
      detail: r.detail + (r.action_hint ? ` — ${r.action_hint}` : ""),
      hrefTab,
    });
    seen.add(r.id);
  }

  const o = snap.operational;
  if (o.low_stock_skus > 0 && !seen.has("low-stock-high") && !seen.has("low-stock-med")) {
    items.push({
      id: "attn-low-stock",
      severity: o.low_stock_skus >= 5 ? "high" : "medium",
      category: "inventory",
      title: `${o.low_stock_skus} SKU(s) at/below reorder`,
      detail: "Replenish before service and website fulfilment stall.",
      hrefTab: "inventory",
    });
  }
  const activeJobs = o.open_service_jobs + o.in_progress_jobs;
  if (activeJobs > 0 && !seen.has("service-backlog") && !seen.has("service-load")) {
    items.push({
      id: "attn-service",
      severity: activeJobs >= 8 ? "high" : "medium",
      category: "service",
      title: `${activeJobs} active service job(s)`,
      detail: `${o.open_service_jobs} open · ${o.in_progress_jobs} in progress.`,
      hrefTab: "service",
    });
  }
  if (o.website_orders_pending > 0 && !seen.has("order-queue")) {
    items.push({
      id: "attn-orders",
      severity: o.website_orders_pending >= 6 ? "high" : "medium",
      category: "website",
      title: `${o.website_orders_pending} website order(s) pending confirm`,
      detail: `Pipeline value ${formatInr(snap.financial.pipeline_value)}.`,
      hrefTab: "website",
    });
  }
  if (snap.tally.failed_push_count > 0 && !seen.has("tally-fail")) {
    items.push({
      id: "attn-tally",
      severity: "high",
      category: "finance",
      title: `${snap.tally.failed_push_count} failed Tally push(es)`,
      detail: "Accounting SoR out of sync for some sales.",
      hrefTab: "invoicing",
    });
  }
  if (snap.receivables && snap.receivables.overdue_count > 0) {
    items.push({
      id: "attn-ar",
      severity: snap.receivables.overdue_total > 500_000 ? "high" : "medium",
      category: "finance",
      title: `Overdue receivables ${formatInr(snap.receivables.overdue_total)}`,
      detail: `${snap.receivables.overdue_count} open item(s) past due.`,
      hrefTab: "invoicing",
    });
  }
  if (snap.imports && snap.imports.delayed_or_hold > 0) {
    items.push({
      id: "attn-import",
      severity: "high",
      category: "imports",
      title: `${snap.imports.delayed_or_hold} import container(s) delayed or on hold`,
      detail: `Value at risk ${formatInr(snap.imports.value_at_risk)}.`,
      hrefTab: "imports",
    });
  }

  items.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));
  return items;
}

export const SUGGESTED_QUESTIONS = [
  "What's the morning brief?",
  "What's low stock?",
  "How is the service backlog?",
  "What's in the order pipeline?",
  "Is Tally healthy?",
  "What's the GMV outlook?",
  "Any overdue receivables?",
  "How are imports looking?",
  "Project margins?",
];

type Intent = {
  keywords: string[];
  answer: (snap: CeoSnapshot) => LocalAiAnswer;
};

const intents: Intent[] = [
  {
    keywords: ["brief", "morning", "today", "summary", "health"],
    answer: (snap) => ({
      title: "Morning brief",
      text: buildMorningBrief(snap).join("\n"),
    }),
  },
  {
    keywords: ["stock", "inventory", "reorder", "sku", "low"],
    answer: (snap) => {
      const n = snap.operational.low_stock_skus;
      const risks = snap.risks.filter((r) => r.category === "inventory");
      return {
        title: "Stock health",
        text:
          n === 0
            ? "No SKUs are currently at or below reorder level."
            : `${n} SKU(s) at/below reorder. Stock capital ${formatInr(snap.financial.stock_capital)}. Moves last 7d: ${snap.operational.stock_moves_7d}.${
                risks.length
                  ? "\n" + risks.map((r) => `• ${r.title}: ${r.detail}`).join("\n")
                  : ""
              }${
                snap.operational.van_low_stock_skus
                  ? `\nVan locations: ${snap.operational.van_low_stock_skus} low-stock signal(s).`
                  : ""
              }`,
      };
    },
  },
  {
    keywords: ["service", "job", "backlog", "technician", "repair"],
    answer: (snap) => {
      const o = snap.operational;
      const active = o.open_service_jobs + o.in_progress_jobs;
      return {
        title: "Service priorities",
        text: `${active} active job(s): ${o.open_service_jobs} open, ${o.in_progress_jobs} in progress, ${o.completed_jobs} completed, ${o.billed_jobs} billed.\nCompletion rate: ${o.service_completion_rate_pct ?? "—"}% · avg close ${o.avg_completion_hours ?? "—"}h · parts used ${formatInr(o.parts_used_value)}.`,
      };
    },
  },
  {
    keywords: ["order", "website", "pipeline", "pending", "gmv", "catalog"],
    answer: (snap) => {
      const f = snap.financial;
      const o = snap.operational;
      return {
        title: "Website order pipeline",
        text: `Pipeline ${formatInr(f.pipeline_value)} (pending ${formatInr(f.pending_order_value)} + confirmed ${formatInr(f.confirmed_not_synced_value)}).\n${o.website_orders_pending} pending confirm · ${o.website_orders_30d} orders in 30d · GMV 7d ${formatInr(f.website_gmv_7d)} / 30d ${formatInr(f.website_gmv_30d)}.`,
      };
    },
  },
  {
    keywords: ["tally", "sync", "bridge", "gateway"],
    answer: (snap) => ({
      title: "Tally bridge",
      text: `Gateway ${snap.tally.gateway_reachable ? "reachable" : "offline"}.\nPending push (confirmed orders): ${snap.tally.pending_push_count}. Failed: ${snap.tally.failed_push_count}. Last success: ${snap.tally.last_push_at ?? "never"}.`,
    }),
  },
  {
    keywords: ["revenue", "sales", "money", "financial", "billed", "capital"],
    answer: (snap) => {
      const f = snap.financial;
      const pred = snap.predictions.find((p) => p.id === "gmv-30d-fwd");
      return {
        title: "Financial pulse",
        text: `Stock capital ${formatInr(f.stock_capital)} · billed service parts ${formatInr(f.billed_parts_value)} (${f.billed_jobs} jobs).\nWebsite GMV all-time ${formatInr(f.website_gmv_all)}.\n${pred ? `Outlook: ${pred.title} → ${pred.estimate} (${pred.confidence}).` : ""}`,
      };
    },
  },
  {
    keywords: ["demo", "booking", "lead"],
    answer: (snap) => ({
      title: "Demo pipeline",
      text: `${snap.operational.demo_bookings_pending} pending demo booking(s); ${snap.operational.demo_bookings_30d} with preferred date in the last/next window (30d filter).`,
    }),
  },
  {
    keywords: ["predict", "outlook", "forecast", "projection"],
    answer: (snap) => ({
      title: "Run-rate outlook",
      text: snap.predictions
        .map((p) => `• [${p.horizon}] ${p.title}: ${p.estimate} (${p.confidence}) — ${p.basis}`)
        .join("\n"),
    }),
  },
  {
    keywords: ["receivable", "overdue", "payment", "collect", "aging", "invoice"],
    answer: (snap) => {
      if (!snap.receivables) {
        return {
          title: "Receivables",
          text: "Receivables module not loaded yet or no data.",
        };
      }
      const r = snap.receivables;
      return {
        title: "Receivables aging",
        text: `Overdue ${formatInr(r.overdue_total)} (${r.overdue_count} items).\nBuckets: 0–30 ${formatInr(r.bucket_0_30)} · 31–60 ${formatInr(r.bucket_31_60)} · 60+ ${formatInr(r.bucket_60_plus)}.\nSources may include inferred website orders and Tally-linked rows — check Invoicing for detail.`,
      };
    },
  },
  {
    keywords: ["container", "import", "shipment", "customs", "port"],
    answer: (snap) => {
      if (!snap.imports) {
        return { title: "Imports", text: "Import tracking data not available yet." };
      }
      const i = snap.imports;
      return {
        title: "Import containers",
        text: `${i.total} container(s) tracked · ${i.delayed_or_hold} delayed/on hold · value at risk ${formatInr(i.value_at_risk)} · on water ${i.on_water}.`,
      };
    },
  },
  {
    keywords: ["project", "turnkey", "margin", "boq"],
    answer: (snap) => {
      if (!snap.projects) {
        return { title: "Projects", text: "Turnkey project data not available yet." };
      }
      const p = snap.projects;
      return {
        title: "Turnkey projects",
        text: `${p.active_count} active · pipeline BOQ ${formatInr(p.pipeline_boq_value)} · lowest margin ${p.lowest_margin_pct ?? "—"}%${p.lowest_margin_customer ? ` (${p.lowest_margin_customer})` : ""}.`,
      };
    },
  },
  {
    keywords: ["machine", "passport", "maintenance", "qr", "predictive"],
    answer: (snap) => {
      if (!snap.maintenance) {
        return {
          title: "Machine risk",
          text: "Maintenance risk scores not available yet.",
        };
      }
      const m = snap.maintenance;
      const lines = m.top_risks
        .map((t) => `• ${t.name} — risk ${t.risk_score}/100 (${t.reason})`)
        .join("\n");
      return {
        title: "Predictive maintenance (rule-based)",
        text: `${m.elevated_count} machine(s) elevated risk.\n${lines || "No elevated machines."}`,
      };
    },
  },
];

export function askLocalCeo(question: string, snap: CeoSnapshot): LocalAiAnswer {
  const q = question.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter(Boolean);
  for (const intent of intents) {
    if (intent.keywords.some((k) => words.some((w) => w.startsWith(k) || q.includes(k)))) {
      return intent.answer(snap);
    }
  }
  return {
    title: "Try a business question",
    text: `I answer from live CEO aggregates (no cloud model required). Try:\n${SUGGESTED_QUESTIONS.map((s) => `• ${s}`).join("\n")}`,
  };
}
