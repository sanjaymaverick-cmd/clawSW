import { useState } from "react";
import { api, ApiError } from "./api";
import { Button } from "./ui";

/** Public site staff login — preferred entry when fronted by the gateway. */
const SITE_LOGIN =
  (import.meta.env.VITE_STAFF_LOGIN_URL as string | undefined) || "/login";

export default function Login({ onToken }: { onToken: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { access_token } = await api.login(email, password);
      onToken(access_token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the API");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(50% 40% at 50% 0%, rgba(224,164,90,0.12), transparent 60%), var(--bg)",
      }}
    >
      <form
        onSubmit={submit}
        className="staff-card w-full max-w-sm space-y-4"
        style={{
          background:
            "radial-gradient(90% 70% at 10% 0%, rgba(224,164,90,0.1), transparent 55%), linear-gradient(180deg, var(--surface-2), var(--surface))",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--wood)",
              margin: 0,
            }}
          >
            Sanjay Wood Tech
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: "6px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            Staff sign-in
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: "8px 0 0" }}>
            Internal operations — inventory, service, orders, invoicing.
          </p>
        </div>
        <label style={{ display: "block" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="staff-input"
            style={{ marginTop: 6, width: "100%" }}
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>
            Password
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="staff-input"
            style={{ marginTop: 6, width: "100%" }}
          />
        </label>
        {error && <p className="staff-alert staff-alert-error">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--dim)", margin: 0 }}>
          Prefer the public site entry?{" "}
          <a href={SITE_LOGIN} style={{ fontWeight: 600, color: "var(--wood)" }}>
            /login
          </a>
        </p>
      </form>
    </div>
  );
}
