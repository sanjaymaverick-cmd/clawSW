import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Warehouse, WebsiteOrder } from "./api";
import { Badge, Button, Card, Pipeline, useToast } from "./ui";

const STATUS_TONE: Record<
  WebsiteOrder["status"],
  "warn" | "ok" | "info"
> = {
  pending: "warn",
  confirmed: "ok",
  synced_to_tally: "info",
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
  const toast = useToast();

  const refresh = useCallback(async () => {
    try {
      const [o, w] = await Promise.all([
        api.listWebsiteOrders(token, filter === "pending" ? "pending" : undefined),
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
      const msg = `Order for ${order.customer_name} confirmed — stock deducted.`;
      setNotice(msg);
      toast.success(msg);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Confirmation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
      await refresh();
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="staff-alert staff-alert-error">{error}</p>}
      {notice && <p className="staff-alert staff-alert-ok">{notice}</p>}

      <Card
        title="Website orders"
        action={
          <select
            value={filter}
            className="staff-select"
            onChange={(e) => setFilter(e.target.value as "pending" | "all")}
          >
            <option value="pending">Pending only</option>
            <option value="all">All statuses</option>
          </select>
        }
      >
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: "0 0 16px" }}>
          {canWrite
            ? "Confirm a pending order to deduct stock and queue it for Tally."
            : "Incoming website orders (read-only for your role)."}
        </p>

        <div className="space-y-4">
          {orders.map((o) => (
            <article
              key={o.id}
              className="staff-card"
              style={{
                background: "var(--bg-2)",
                boxShadow: "none",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {o.customer_name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--dim)", marginTop: 2 }}>
                    {new Date(o.created_at).toLocaleString()} · {o.email}
                    {o.phone ? ` · ${o.phone}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge tone={STATUS_TONE[o.status]}>
                    {o.status.replace(/_/g, " ")}
                  </Badge>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>
                    ₹{o.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Pipeline status={o.status} />
              </div>

              <ul
                style={{
                  margin: "0 0 12px",
                  padding: 0,
                  listStyle: "none",
                  fontSize: "0.875rem",
                  color: "var(--muted)",
                }}
              >
                {o.items.map((i) => (
                  <li key={i.id} style={{ padding: "2px 0" }}>
                    {i.quantity}×{" "}
                    <span
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "0.75rem",
                        color: "var(--dim)",
                      }}
                    >
                      {i.sku}
                    </span>{" "}
                    {i.item_name}
                  </li>
                ))}
              </ul>

              {canWrite && o.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={chosen[o.id] ?? ""}
                    className="staff-select"
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
                  <Button
                    variant="primary"
                    onClick={() => void confirm(o)}
                    disabled={busyId === o.id || warehouses.length === 0}
                  >
                    {busyId === o.id ? "Confirming…" : "Confirm order"}
                  </Button>
                </div>
              )}
            </article>
          ))}

          {orders.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--dim)",
                fontSize: "0.875rem",
                padding: "24px 0",
                margin: 0,
              }}
            >
              {filter === "pending"
                ? "No pending orders."
                : "No website orders yet."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
