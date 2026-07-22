import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Warehouse, WebsiteOrder } from "./api";

const buttonCls =
  "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
const selectCls =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";

const STATUS_BADGE: Record<WebsiteOrder["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-green-50 text-green-700",
  synced_to_tally: "bg-blue-50 text-blue-700",
};

/**
 * Phase 9 — staff view for pending website orders, replacing the Phase 4
 * `/docs`-only workaround. Read access follows the website permission
 * (owner/manager/accountant/warehouse can view); confirming an order needs
 * website:write, so accountant and warehouse see the list read-only while
 * owner/manager can pick a warehouse and confirm — which deducts stock and
 * logs a stock_move via the existing backend endpoint.
 */
export default function WebsitePage({
  token,
  canWrite,
}: {
  token: string;
  canWrite: boolean;
}) {
  const [orders, setOrders] = useState<WebsiteOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [o, w] = await Promise.all([
        api.listWebsiteOrders(token, filter === "pending" ? "pending" : undefined),
        // Warehouse list drives the confirm dropdown; only writers need it,
        // but reading it is harmless (inventory:read covers these roles too).
        canWrite ? api.listWarehouses(token) : Promise.resolve([]),
      ]);
      setOrders(o);
      setWarehouses(w);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders");
    }
  }, [token, filter, canWrite]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirm = async (order: WebsiteOrder) => {
    const warehouseId = chosen[order.id] || warehouses[0]?.id;
    if (!warehouseId) {
      setError("Add a warehouse before confirming orders.");
      return;
    }
    setBusyId(order.id);
    setNotice(null);
    setError(null);
    try {
      await api.confirmWebsiteOrder(token, order.id, warehouseId);
      setNotice(`Order for ${order.customer_name} confirmed — stock deducted.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Confirmation failed");
    } finally {
      setBusyId(null);
      await refresh();
    }
  };

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

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Website orders</h2>
            <p className="text-sm text-slate-500">
              {canWrite
                ? "Confirm a pending order to deduct stock and queue it for Tally."
                : "Incoming website orders (read-only for your role)."}
            </p>
          </div>
          <select
            value={filter}
            className={selectCls}
            onChange={(e) => setFilter(e.target.value as "pending" | "all")}
          >
            <option value="pending">Pending only</option>
            <option value="all">All statuses</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Placed</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 pr-4">Status</th>
                {canWrite && <th className="py-2">Confirm</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 font-medium text-slate-800">
                    {o.customer_name}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    <div>{o.email}</div>
                    {o.phone && <div className="text-xs text-slate-400">{o.phone}</div>}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    <ul className="space-y-0.5">
                      {o.items.map((i) => (
                        <li key={i.id}>
                          {i.quantity}×{" "}
                          <span className="font-mono text-xs text-slate-500">
                            {i.sku}
                          </span>{" "}
                          {i.item_name}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 pr-4 text-right font-medium text-slate-800 whitespace-nowrap">
                    ₹{o.total.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[o.status]}`}
                    >
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="py-2">
                      {o.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={chosen[o.id] ?? ""}
                            className={selectCls}
                            onChange={(e) =>
                              setChosen({ ...chosen, [o.id]: e.target.value })
                            }
                          >
                            <option value="">
                              {warehouses[0] ? warehouses[0].name : "No warehouse"}
                            </option>
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => void confirm(o)}
                            disabled={busyId === o.id || warehouses.length === 0}
                            className={buttonCls}
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={canWrite ? 7 : 6}
                    className="py-4 text-center text-slate-400"
                  >
                    {filter === "pending"
                      ? "No pending orders."
                      : "No website orders yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
