"use client";

import { useMemo, useState } from "react";
import { BROWSER_API_URL, CatalogItem } from "../../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.5rem 0.75rem",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: "0.9375rem",
};

const buttonStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 1rem",
  fontSize: "0.9375rem",
  cursor: "pointer",
};

export default function CatalogClient({ items }: { items: CatalogItem[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { kind: "ok"; id: string } | { kind: "error"; message: string } | null
  >(null);

  const byId = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items]
  );
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 600 }}>{item.name}</div>
              <div style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                {item.sku}
                {item.category ? ` · ${item.category}` : ""}
                {item.is_spare ? " · spare" : ""}
                {item.is_tool ? " · tool" : ""}
              </div>
              {item.description && (
                <div
                  style={{
                    color: "#475569",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {item.description}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>
                ₹{item.price.toLocaleString("en-IN")}
                {item.unit ? (
                  <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                    {" "}
                    / {item.unit}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: item.in_stock ? "#15803d" : "#b91c1c",
                }}
              >
                {item.in_stock ? "In stock" : "Out of stock"}
              </div>
            </div>
            <input
              type="number"
              min={0}
              value={cart[item.id] ?? 0}
              onChange={(e) => setQty(item.id, Number(e.target.value))}
              disabled={!item.in_stock}
              aria-label={`Quantity of ${item.name}`}
              style={{ ...inputStyle, width: 72 }}
            />
          </div>
        ))}
      </div>

      <form
        onSubmit={placeOrder}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          display: "grid",
          gap: "0.75rem",
          position: "sticky",
          top: "1rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.125rem" }}>Your order</h2>
        {cartLines.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            Set quantities on the items you need, then order here. We confirm
            every order by phone/email before dispatch.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
            {cartLines.map(([id, qty]) => (
              <li key={id}>
                {byId[id]?.name} × {qty}
              </li>
            ))}
          </ul>
        )}
        <div style={{ fontWeight: 600 }}>
          Total: ₹{total.toLocaleString("en-IN")}
        </div>
        <input
          style={inputStyle}
          placeholder="Your name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
        <input
          style={inputStyle}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={inputStyle}
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          style={{
            ...buttonStyle,
            opacity: submitting || cartLines.length === 0 ? 0.6 : 1,
          }}
          disabled={submitting || cartLines.length === 0}
          type="submit"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        {result?.kind === "ok" && (
          <p style={{ margin: 0, color: "#15803d", fontSize: "0.875rem" }}>
            Order received! Reference: {result.id}. We will contact you to
            confirm.
          </p>
        )}
        {result?.kind === "error" && (
          <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.875rem" }}>
            {result.message}
          </p>
        )}
      </form>
    </div>
  );
}
