import { Fragment, useCallback, useEffect, useState } from "react";
import { api, ApiError, AuditEntry } from "./api";

const RESOURCES = ["", "users", "stock_moves", "service_jobs", "website_orders"];
const ACTIONS = ["", "create", "update", "delete"];

const ACTION_BADGE: Record<AuditEntry["action"], string> = {
  create: "bg-green-50 text-green-700",
  update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-700",
};

export default function AuditPage({ token }: { token: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setEntries(
        await api.listAudit(token, {
          resource: resource || undefined,
          action: action || undefined,
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load audit log");
    }
  }, [token, resource, action]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error && !entries) {
    return (
      <p className="staff-alert staff-alert-error">{error}</p>
    );
  }
  if (!entries) {
    return <p className="text-sm text-[var(--dim)]">Loading…</p>;
  }

  return (
    <section className="staff-card p-6 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="staff-card-title">Audit log</h2>
          <p className="text-sm text-[var(--dim)]">
            Every write to users, stock moves, service jobs and website orders,
            recorded automatically. “no user” = public website or sync worker.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-sm"
          >
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {r === "" ? "All resources" : r.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-sm"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === "" ? "All actions" : a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="staff-alert staff-alert-error">{error}</p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--dim)]">No audit entries match.</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--dim)]">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Who</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Resource</th>
              <th className="py-2 pr-4">IP</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <Fragment key={e.id}>
                <tr>
                  <td className="py-2 pr-4 text-[var(--muted)] whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-[var(--text)]">
                    {e.user_name ?? <span className="text-[var(--dim)]">no user</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE[e.action]}`}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-[var(--muted)]">
                    {e.resource.replace("_", " ")}{" "}
                    <span className="text-[var(--dim)]">
                      {e.resource_id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{e.ip_address ?? ""}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() =>
                        setExpanded(expanded === e.id ? null : e.id)
                      }
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      {expanded === e.id ? "hide" : "details"}
                    </button>
                  </td>
                </tr>
                {expanded === e.id && (
                  <tr>
                    <td colSpan={6} className="pb-3">
                      <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-[var(--text)]">
                        {JSON.stringify(e.payload_snapshot, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
