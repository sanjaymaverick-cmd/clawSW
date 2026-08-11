"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Product } from "../../lib/content";
import { IconMachine } from "../components/icons";

type Props = {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
};

export default function MachineryBrowser({
  products,
  categories,
  initialCategory = "all",
}: Props) {
  const searchParams = useSearchParams();
  const catFromUrl = searchParams.get("cat") || initialCategory;
  const [category, setCategory] = useState(catFromUrl);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCategory(catFromUrl);
  }, [catFromUrl]);

  const filtered = useMemo(() => {
    let list = products;
    if (category && category !== "all") {
      list = list.filter((p) => p.category_slugs?.includes(category));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.model ?? "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, category, query]);

  const activeCat = categories.find((c) => c.slug === category);

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 28,
          alignItems: "center",
        }}
      >
        <input
          type="search"
          placeholder="Search machines, models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search machinery"
          style={{
            flex: "1 1 220px",
            minWidth: 200,
            maxWidth: 360,
            padding: "12px 16px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: "0.95rem",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            label={`All (${products.length})`}
          />
          {categories.map((c) => (
            <FilterChip
              key={c.slug}
              active={category === c.slug}
              onClick={() => setCategory(c.slug)}
              label={`${c.name.replace("Solid Woodworking Machinery — ", "Taiwan · ").replace(" Machinery", "")} (${c.count})`}
            />
          ))}
        </div>
      </div>

      {activeCat && category !== "all" && (
        <p className="muted" style={{ marginBottom: 28, maxWidth: 720 }}>
          {activeCat.description}
        </p>
      )}

      <div
        className="dim"
        style={{ marginBottom: 18, fontSize: "0.88rem" }}
      >
        {filtered.length} machine{filtered.length === 1 ? "" : "s"}
        {query ? ` matching “${query}”` : ""}
      </div>

      {filtered.length === 0 ? (
        <p className="muted">No machines match your filters.</p>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: "var(--r-pill)",
        border: `1px solid ${active ? "rgba(224,164,90,0.45)" : "var(--border)"}`,
        background: active ? "rgba(224,164,90,0.12)" : "var(--surface)",
        color: active ? "var(--wood)" : "var(--text-muted)",
        fontSize: "0.82rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  return (
    <Link
      href={`/machinery/${p.slug}`}
      className="card"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.2s",
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "var(--wood-2)",
              opacity: 0.5,
            }}
          >
            <IconMachine />
          </div>
        )}
        {p.is_new && (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              padding: "4px 10px",
              borderRadius: "var(--r-pill)",
              background: "rgba(224,164,90,0.92)",
              color: "#1a1208",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            New
          </span>
        )}
      </div>
      <div style={{ padding: 22, display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          className="pill-note"
          style={{
            color: "var(--wood)",
            borderColor: "rgba(224,164,90,0.3)",
            background: "rgba(224,164,90,0.08)",
            alignSelf: "flex-start",
            fontSize: "0.75rem",
            marginBottom: 10,
          }}
        >
          {p.category}
        </div>
        <h2
          className="h3"
          style={{ fontSize: "1.12rem", lineHeight: 1.35, margin: 0 }}
        >
          {p.name}
        </h2>
        {p.description && (
          <p
            className="muted"
            style={{
              marginTop: 10,
              fontSize: "0.88rem",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.description}
          </p>
        )}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            color: "var(--wood)",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          View details →
        </div>
      </div>
    </Link>
  );
}
