import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  TallyStatus,
  TallySyncLogEntry,
  WebsiteOrder,
} from "./api";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

const LOG_BADGE: Record<TallySyncLogEntry["status"], string> = {
  success: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  payment_received: "bg-blue-50 text-blue-700",
};

export default function TallyPage({
  token,
  canWrite,
}: {
  token: string;
  canWrite: boolean;
}) {
  const [status, setStatus] = useState<TallyStatus | null>(null);
  const [pending, setPending] = useState<WebsiteOrder[]>([]);
  const [log, setLog] = useState<TallySyncLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, orders, entries] = await Promise.all([
        api.tallyStatus(token),
        api.listWebsiteOrders(token, "confirmed"),
        api.tallySyncLog(token),
      ]);
      setStatus(s);
      setPending(orders);
      setLog(entries);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load Tally status");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const push = async (orderId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await api.tallyPushOrder(token, orderId);
      setNotice("Sales voucher pushed to Tally.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Push failed");
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  const pullPayments = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const entries = await api.tallyPullPayments(token);
      setNotice(
        entries.length === 0
          ? "No new payments found in Tally."
          : `${entries.length} payment(s) recorded from Tally.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment pull failed");
    } finally {
      setBusy(false);
      void refresh();
    }
  };

  if (error && !status) {
    return (
      <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
    );
  }
  if (!status) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {notice && (
        <p className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tally gateway"
          value={status.gateway_reachable ? "online" : "offline"}
        />
        <Stat label="Awaiting push" value={status.pending_push_count} />
        <Stat label="Synced orders" value={status.synced_order_count} />
        <Stat label="Failed pushes" value={status.failed_push_count} />
      </div>

      <section className="bg-white rounded-xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Confirmed orders awaiting Tally sync
          </h2>
          {canWrite && (
            <button
              onClick={() => void pullPayments()}
              disabled={busy}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Pull payment status
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">
          The bridge worker pushes these automatically; pushing here syncs an
          invoice immediately.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing waiting to sync.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Placed</th>
                {canWrite && <th className="py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 pr-4 text-slate-800">{o.customer_name}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {o.items.map((i) => `${i.quantity}× ${i.sku}`).join(", ")}
                  </td>
                  <td className="py-2 pr-4 text-slate-800">
                    ₹{o.total.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  {canWrite && (
                    <td className="py-2 text-right">
                      <button
                        onClick={() => void push(o.id)}
                        disabled={busy}
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        Push to Tally
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Sync log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-slate-400">No sync activity yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Direction</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {log.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">
                    {new Date(e.synced_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {e.direction === "to_tally" ? "→ Tally" : "← Tally"}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {e.entity_type}{" "}
                    <span className="text-slate-400">
                      {e.entity_id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${LOG_BADGE[e.status]}`}
                    >
                      {e.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">{e.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
