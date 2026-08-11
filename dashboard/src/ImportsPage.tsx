import { useCallback, useEffect, useState } from "react";
import { api, ApiError, ImportContainer } from "./api";
import { Badge, Button, Card } from "./ui";
import { formatInr } from "./lib/money";

export default function ImportsPage({
  token,
  canWrite,
}: {
  token: string;
  canWrite: boolean;
}) {
  const [rows, setRows] = useState<ImportContainer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    origin: "",
    port: "",
    status: "On Water",
    value_inr: "",
    delay_days: "0",
    machine_count: "0",
  });

  const refresh = useCallback(async () => {
    try {
      setRows(await api.listImportContainers(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load containers");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      {error && <p className="staff-alert staff-alert-error">{error}</p>}
      <Card title="Import containers">
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: 0 }}>
          Track inbound machinery containers — ETA, customs, delays, value at risk.
        </p>
        <div className="overflow-x-auto">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Origin / Port</th>
                <th>Status</th>
                <th>Value</th>
                <th>Delay</th>
                <th>Machines</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: "var(--text)", fontWeight: 600 }}>{c.code}</td>
                  <td>
                    {c.origin ?? "—"}
                    <div style={{ fontSize: "0.75rem", color: "var(--dim)" }}>{c.port}</div>
                  </td>
                  <td>
                    <Badge tone={c.status === "Customs Hold" || c.delay_days > 0 ? "warn" : "neutral"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td>{formatInr(c.value_inr)}</td>
                  <td>{c.delay_days}d</td>
                  <td>{c.machine_count}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--dim)" }}>
                    No containers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {canWrite && (
        <Card title="Add container">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createImportContainer(token, {
                  code: form.code,
                  origin: form.origin || null,
                  port: form.port || null,
                  status: form.status,
                  value_inr: Number(form.value_inr) || 0,
                  delay_days: Number(form.delay_days) || 0,
                  machine_count: Number(form.machine_count) || 0,
                });
                setForm({
                  code: "",
                  origin: "",
                  port: "",
                  status: "On Water",
                  value_inr: "",
                  delay_days: "0",
                  machine_count: "0",
                });
                await refresh();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Create failed");
              }
            }}
          >
            <input className="staff-input" required placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="staff-input" placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
            <input className="staff-input" placeholder="Port" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            <select className="staff-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {["On Water", "At Port", "Customs Hold", "Cleared", "Delivered"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input className="staff-input" placeholder="Value INR" value={form.value_inr} onChange={(e) => setForm({ ...form, value_inr: e.target.value })} />
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
