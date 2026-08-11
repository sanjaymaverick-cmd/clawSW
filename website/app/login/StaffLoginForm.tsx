"use client";

import { useState } from "react";
import Link from "next/link";
import { BROWSER_API_URL, enterStaffDashboard } from "../../lib/api";

export default function StaffLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch(`${BROWSER_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        const detail =
          typeof body?.detail === "string"
            ? body.detail
            : resp.status === 429
              ? "Too many failed attempts. Try again later."
              : "Invalid email or password";
        throw new Error(detail);
      }
      if (!body?.access_token || typeof body.access_token !== "string") {
        throw new Error("Unexpected response from the server.");
      }
      enterStaffDashboard(body.access_token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the staff API",
      );
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="card card-glow"
      style={{
        display: "grid",
        gap: 18,
        padding: "clamp(32px, 5vw, 44px)",
        maxWidth: 440,
        width: "100%",
        background:
          "radial-gradient(90% 80% at 10% 0%, rgba(224,164,90,0.12), transparent 55%), linear-gradient(180deg, var(--surface-2), var(--surface))",
        boxShadow: "var(--shadow-lg), 0 0 0 1px rgba(224,164,90,0.08)",
      }}
    >
      <div>
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          Staff only
        </p>
        <h1
          style={{
            fontFamily: "var(--font-sora), sans-serif",
            fontSize: "1.65rem",
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Sign in to staff tools
        </h1>
        <p className="muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>
          Inventory, service jobs, website orders, invoicing, and admin — for
          Sanjay Wood Tech team members.
        </p>
      </div>

      <label className="field" style={{ display: "grid", gap: 6 }}>
        <span className="label">Email</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@sanjaywoodtech.com"
        />
      </label>

      <label className="field" style={{ display: "grid", gap: 6 }}>
        <span className="label">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </label>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "#f0a0a0",
            background: "rgba(180,40,40,0.12)",
            border: "1px solid rgba(180,40,40,0.35)",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn btn-wood"
        style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="dim" style={{ margin: 0, fontSize: "0.82rem", textAlign: "center" }}>
        Looking for machinery or spares?{" "}
        <Link href="/" style={{ color: "var(--wood)" }}>
          Back to the public site
        </Link>
      </p>

      {process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true" && (
        <details
          style={{
            marginTop: 4,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text)" }}>
            Demo test accounts
          </summary>
          <p style={{ margin: "10px 0 8px" }}>
            Password for all: <code>demo-password</code>
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>owner@clawsw.example</li>
            <li>manager@clawsw.example</li>
            <li>accountant@clawsw.example</li>
            <li>service_manager@clawsw.example</li>
            <li>technician@clawsw.example</li>
            <li>warehouse@clawsw.example</li>
          </ul>
        </details>
      )}
    </form>
  );
}
