import { useCallback, useEffect, useState } from "react";
import { api, ApiError, ReportSummary } from "./api";

const STATUS_ORDER = ["open", "in_progress", "completed", "billed"];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl shadow p-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

export default function DashboardPage({ token }: { token: string }) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSummary(await api.reportSummary(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>;
  }
  if (!summary) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  const { stock, service, financial, people } = summary;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stock && (
          <>
            <Stat label="Items" value={stock.total_items} />
            <Stat
              label="Stock value"
              value={`₹${stock.total_stock_value.toLocaleString()}`}
            />
          </>
        )}
        {service && (
          <Stat
            label="Open jobs"
            value={
              (service.jobs_by_status["open"] ?? 0) +
              (service.jobs_by_status["in_progress"] ?? 0)
            }
          />
        )}
        {financial && <Stat label="Billed jobs" value={financial.billed_jobs} />}
        {people && <Stat label="Active users" value={people.active_users} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {stock && (
          <Card title="Low stock">
            {stock.low_stock.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nothing at or below its reorder level.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4 text-right">On hand</th>
                    <th className="py-2 text-right">Reorder at</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.low_stock.map((row) => (
                    <tr key={row.sku} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700">
                        {row.sku}
                      </td>
                      <td className="py-2 pr-4 text-slate-800">{row.name}</td>
                      <td className="py-2 pr-4 text-right font-medium text-amber-700">
                        {row.total_quantity}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        {row.reorder_level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-slate-400">
              {stock.moves_last_7_days} stock movements in the last 7 days ·{" "}
              {stock.total_warehouses} warehouse(s)
            </p>
          </Card>
        )}

        {service && (
          <Card title="Service jobs">
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.filter((s) => service.jobs_by_status[s]).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {s.replace("_", " ")}: {service.jobs_by_status[s]}
                </span>
              ))}
            </div>
            {service.open_by_technician.length > 0 && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Technician</th>
                    <th className="py-2 text-right">Open jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {service.open_by_technician.map((row) => (
                    <tr key={row.technician_name} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-800">
                        {row.technician_name}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-700">
                        {row.open_jobs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-slate-400">
              {service.avg_completion_hours !== null &&
                `Avg completion: ${service.avg_completion_hours} h · `}
              Parts used to date: ₹{service.parts_used_value.toLocaleString()}
            </p>
          </Card>
        )}

        {financial && (
          <Card title="Financial (pre-Tally placeholder)">
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-slate-600">Billed service jobs</dt>
                <dd className="font-medium text-slate-800">{financial.billed_jobs}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Parts value on billed jobs</dt>
                <dd className="font-medium text-slate-800">
                  ₹{financial.billed_parts_value.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Current stock valuation</dt>
                <dd className="font-medium text-slate-800">
                  ₹{financial.stock_value.toLocaleString()}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-slate-400">
              Real invoicing figures arrive with the Tally sync (Phase 5).
            </p>
          </Card>
        )}

        {people && (
          <Card title="Team">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 text-right">Active users</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(people.users_by_role).map(([role, count]) => (
                  <tr key={role} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-800">{role}</td>
                    <td className="py-2 text-right font-medium text-slate-700">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
