"use client";

import { useMemo, useState } from "react";
import { BROWSER_API_URL, CatalogItem } from "../../lib/api";
import EmptyState from "../components/EmptyState";

export default function CatalogClient({ items }: { items: CatalogItem[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { kind: "ok"; id: string } | { kind: "error"; message: string } | null
  >(null);

  const byId = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const cartLines = Object.entries(cart).filter(([, qty]) => qty > 0);
  const total = cartLines.reduce(
    (sum, [id, qty]) => sum + (byId[id]?.price ?? 0) * qty,
    0
  );

  const setQty = (id: string, qty: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const resp = await fetch(`${BROWSER_API_URL}/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          email,
          phone: phone || null,
          items: cartLines.map(([item_id, quantity]) => ({
            item_id,
            quantity,
          })),
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : "Could not place the order. Please check your details."
        );
      }
      const body = await resp.json();
      setResult({ kind: "ok", id: body.id });
      setCart({});
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="catalog-layout">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ position: "relative", marginBottom: 6 }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth="2"
            style={{ position: "absolute", left: 15, top: 15 }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            className="input"
            style={{ paddingLeft: 44 }}
            placeholder="Search by name, SKU or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search catalog"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="⌕"
            title={`No items match “${query}”`}
            description="Try a different SKU, part name, or clear the search to see the full catalog."
            actionLabel="Browse machinery"
            actionHref="/machinery"
          />
        ) : (
          filtered.map((item) => {
            const qty = cart[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: "18px 22px",
                  display: "flex",
                  gap: 18,
                  alignItems: "center",
                  flexWrap: "wrap",
                  borderColor: qty > 0 ? "rgba(224,164,90,0.4)" : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: "1.02rem" }}>
                    {item.name}
                  </div>
                  <div className="dim" style={{ fontSize: "0.8rem", marginTop: 3 }}>
                    {item.sku}
                    {item.category ? ` · ${item.category}` : ""}
                    {item.is_spare ? " · spare" : ""}
                    {item.is_tool ? " · tool" : ""}
                  </div>
                  {item.description && (
                    <div
                      className="muted"
                      style={{ fontSize: "0.88rem", marginTop: 6 }}
                    >
                      {item.description}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    ₹{item.price.toLocaleString("en-IN")}
                    {item.unit ? (
                      <span className="dim" style={{ fontWeight: 400 }}>
                        {" "}
                        / {item.unit}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={item.in_stock ? "pill-note pill-ok" : "pill-note pill-off"}
                    style={{ marginTop: 6 }}
                  >
                    {item.in_stock ? "In stock" : "Out of stock"}
                  </span>
                </div>

                <div className="qty">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name}`}
                    disabled={!item.in_stock || qty <= 0}
                    onClick={() => setQty(item.id, qty - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={qty}
                    onChange={(e) => setQty(item.id, Number(e.target.value))}
                    disabled={!item.in_stock}
                    aria-label={`Quantity of ${item.name}`}
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${item.name}`}
                    disabled={!item.in_stock}
                    onClick={() => setQty(item.id, qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={placeOrder} className="order-panel card glass">
        <h2 className="h3" style={{ fontSize: "1.2rem" }}>
          Your order
        </h2>
        {cartLines.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Set quantities on the items you need, then order here. We confirm
            every order by phone or email before dispatch.
          </p>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: 0,
              listStyle: "none",
              display: "grid",
              gap: 8,
              fontSize: "0.9rem",
            }}
          >
            {cartLines.map(([id, qty]) => (
              <li
                key={id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span className="muted">
                  {byId[id]?.name} × {qty}
                </span>
                <span style={{ fontWeight: 600 }}>
                  ₹{((byId[id]?.price ?? 0) * qty).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        )}

        <hr className="divider" />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span className="muted">Total</span>
          <span className="stat-num" style={{ fontSize: "1.7rem" }}>
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="field">
          <input
            className="input"
            placeholder="Your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <input
            className="input"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={submitting || cartLines.length === 0}
          type="submit"
          style={{
            opacity: submitting || cartLines.length === 0 ? 0.55 : 1,
            width: "100%",
          }}
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>

        {result?.kind === "ok" && (
          <p style={{ color: "#4ade80", fontSize: "0.9rem" }}>
            Order received! Reference: {result.id}. We&apos;ll contact you to
            confirm.
          </p>
        )}
        {result?.kind === "error" && (
          <p style={{ color: "#fb7185", fontSize: "0.9rem" }}>{result.message}</p>
        )}
      </form>

      <style>{`
        .catalog-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
          gap: 26px;
          align-items: start;
        }
        .order-panel {
          position: sticky;
          top: 92px;
          display: grid;
          gap: 14px;
          padding: 24px;
        }
        .qty {
          display: inline-flex;
          align-items: center;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-pill);
          overflow: hidden;
          background: var(--bg-2);
        }
        .qty button {
          width: 38px;
          height: 40px;
          border: none;
          background: transparent;
          color: var(--text);
          font-size: 1.2rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .qty button:hover:not(:disabled) { background: var(--elevated); color: var(--wood); }
        .qty button:disabled { opacity: 0.3; cursor: not-allowed; }
        .qty input {
          width: 46px;
          height: 40px;
          border: none;
          background: transparent;
          color: var(--text);
          text-align: center;
          font-size: 0.95rem;
          -moz-appearance: textfield;
        }
        .qty input::-webkit-outer-spin-button,
        .qty input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        @media (max-width: 860px) {
          .catalog-layout { grid-template-columns: 1fr; }
          .order-panel { position: static; }
        }
      `}</style>
    </div>
  );
}
