"use client";

import { useState } from "react";
import { BROWSER_API_URL, Machinery } from "../../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.5rem 0.75rem",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: "0.9375rem",
};

export default function BookingForm({ machines }: { machines: Machinery[] }) {
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [machineryId, setMachineryId] = useState(machines[0]?.id ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { kind: "ok"; id: string } | { kind: "error"; message: string } | null
  >(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const resp = await fetch(`${BROWSER_API_URL}/public/demo-bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          email,
          phone: phone || null,
          machinery_id: machineryId,
          preferred_date: preferredDate || null,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : "Could not submit the booking. Please check your details."
        );
      }
      const body = await resp.json();
      setResult({ kind: "ok", id: body.id });
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
    <form
      onSubmit={submit}
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "1.5rem",
        display: "grid",
        gap: "0.75rem",
      }}
    >
      <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>
        Machine
        <select
          style={{ ...inputStyle, marginTop: "0.25rem" }}
          value={machineryId}
          onChange={(e) => setMachineryId(e.target.value)}
          required
        >
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.category ? ` (${m.category})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>
        Preferred date
        <input
          style={{ ...inputStyle, marginTop: "0.25rem" }}
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
        />
      </label>
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
        type="submit"
        disabled={submitting}
        style={{
          background: "#0f172a",
          color: "#ffffff",
          border: "none",
          borderRadius: 8,
          padding: "0.625rem 1rem",
          fontSize: "0.9375rem",
          cursor: "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Submitting…" : "Request demo"}
      </button>
      {result?.kind === "ok" && (
        <p style={{ margin: 0, color: "#15803d", fontSize: "0.875rem" }}>
          Booking received! Reference: {result.id}. We will contact you to
          confirm.
        </p>
      )}
      {result?.kind === "error" && (
        <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.875rem" }}>
          {result.message}
        </p>
      )}
    </form>
  );
}
