"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type IndustryOption = {
  slug: string;
  name: string;
  blurb: string;
  machineHints: string[];
  href: string;
};

const OPTIONS: IndustryOption[] = [
  {
    slug: "furniture-manufacturers",
    name: "Furniture",
    blurb: "Panel lines, edge banding, nesting CNC for modular furniture.",
    machineHints: ["Beam saw", "Edge bander", "CNC nesting"],
    href: "/industries/furniture-manufacturers",
  },
  {
    slug: "modular-kitchen",
    name: "Modular kitchen",
    blurb: "High-volume panel processing with tight edge quality.",
    machineHints: ["Panel saw", "Edge bander", "Boring"],
    href: "/industries/modular-kitchen",
  },
  {
    slug: "door-window",
    name: "Doors & windows",
    blurb: "Solid wood moulding, tenoning, and wide-belt finishing.",
    machineHints: ["Four-side moulder", "Tenoner", "Wide-belt sander"],
    href: "/industries/door-window",
  },
  {
    slug: "plywood-panel",
    name: "Plywood / panel",
    blurb: "Veneer and panel lines for mills and board plants.",
    machineHints: ["Hot press", "Guillotine", "Sanding"],
    href: "/industries/plywood-panel",
  },
];

const STORAGE_KEY = "swt_industry_shortlist";

/**
 * P1 engagement loop — pick an industry, get a shortlist, hand off to demo.
 */
export default function IndustryMatcher() {
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { slug?: string };
        if (parsed.slug) setSelected(parsed.slug);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const pick = useMemo(
    () => OPTIONS.find((o) => o.slug === selected) ?? null,
    [selected],
  );

  function choose(slug: string) {
    setSelected(slug);
    setSaved(true);
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ slug, at: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card" style={{ padding: "clamp(22px, 3vw, 32px)" }}>
      <span className="eyebrow">Industry matcher</span>
      <h3 className="h3" style={{ marginTop: 12, fontSize: "1.25rem" }}>
        Which workshop are you equipping?
      </h3>
      <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>
        Pick one — we&apos;ll surface the machine set buyers in your segment start with.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginTop: 20,
        }}
      >
        {OPTIONS.map((o) => {
          const active = selected === o.slug;
          return (
            <button
              key={o.slug}
              type="button"
              onClick={() => choose(o.slug)}
              className="btn"
              style={{
                padding: "14px 12px",
                borderRadius: "var(--r-md)",
                borderColor: active ? "rgba(224,164,90,0.55)" : undefined,
                background: active
                  ? "rgba(224,164,90,0.12)"
                  : "var(--surface-2)",
                color: active ? "var(--wood)" : "var(--text)",
                whiteSpace: "normal",
                textAlign: "center",
                fontSize: "0.88rem",
              }}
            >
              {o.name}
            </button>
          );
        })}
      </div>

      {pick && (
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--border)",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{pick.name}</p>
          <p className="muted" style={{ margin: "8px 0 12px", fontSize: "0.9rem" }}>
            {pick.blurb}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {pick.machineHints.map((h) => (
              <span key={h} className="badge">
                {h}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href={pick.href} className="btn btn-ghost">
              Industry guide
            </Link>
            <Link href="/machinery" className="btn btn-ghost">
              Browse machines
            </Link>
            <Link
              href={`/book-demo?industry=${encodeURIComponent(pick.slug)}`}
              className="btn btn-wood"
            >
              Book a demo
            </Link>
          </div>
          {saved && (
            <p className="dim" style={{ margin: "12px 0 0", fontSize: "0.78rem" }}>
              Saved for this session — you can leave and come back.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
