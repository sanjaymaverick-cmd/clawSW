"use client";

import { useState } from "react";
import { BROWSER_API_URL, Machinery } from "../../lib/api";

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
      className="card"
      style={{ display: "grid", gap: 16, padding: 28 }}
    >
      <div className="field">
        <label className="label" htmlFor="bf-machine">
          Machine
        </label>
        <select
          id="bf-machine"
          className="select"
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
      </div>

      <div className="field">
        <label className="label" htmlFor="bf-date">
          Preferred date
        </label>
        <input
          id="bf-date"
          className="input"
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="bf-name">
          Your name
        </label>
        <input
          id="bf-name"
          className="input"
          placeholder="Full name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="bf-email">
          Email
        </label>
        <input
          id="bf-email"
          className="input"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="bf-phone">
          Phone <span className="dim">(optional)</span>
        </label>
        <input
          id="bf-phone"
          className="input"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
        style={{ opacity: submitting ? 0.6 : 1, width: "100%" }}
      >
        {submitting ? "Submitting…" : "Request demo"}
      </button>

      {result?.kind === "ok" && (
        <p style={{ color: "#4ade80", fontSize: "0.9rem" }}>
          Booking received! Reference: {result.id}. We&apos;ll contact you to
          confirm.
        </p>
      )}
      {result?.kind === "error" && (
        <p style={{ color: "#fb7185", fontSize: "0.9rem" }}>{result.message}</p>
      )}
    </form>
  );
}
