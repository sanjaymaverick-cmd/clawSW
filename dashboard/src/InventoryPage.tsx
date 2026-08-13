import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Item, StockLevel, StockMove, Warehouse } from "./api";

const inputCls = "staff-input";
const buttonCls = "staff-btn staff-btn-primary";

export default function InventoryPage({
  token,
  canWrite,
}: {
  token: string;
  canWrite: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [i, w, s, m] = await Promise.all([
        api.listItems(token),
        api.listWarehouses(token),
        api.listStock(token),
        api.listStockMoves(token),
      ]);
      setItems(i);
      setWarehouses(w);
      setStock(s);
      setMoves(m);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load inventory");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onError = (err: unknown, fallback: string) =>
    setError(err instanceof ApiError ? err.message : fallback);

  return (
    <div className="space-y-6">
      {error && (
        <p className="staff-alert staff-alert-error">{error}</p>
      )}

      <ItemsSection
        items={items}
        canWrite={canWrite}
        onCreate={async (body) => {
          try {
            await api.createItem(token, body);
            await refresh();
          } catch (err) {
            onError(err, "Failed to create item");
          }
        }}
      />

      <StockSection
        stock={stock}
        items={items}
        warehouses={warehouses}
        canWrite={canWrite}
        onAdjust={async (body) => {
          try {
            await api.adjustStock(token, body);
            await refresh();
          } catch (err) {
            onError(err, "Failed to adjust stock");
          }
        }}
        onTransfer={async (body) => {
          try {
            await api.transferStock(token, body);
            await refresh();
          } catch (err) {
            onError(err, "Failed to transfer stock");
          }
        }}
      />

      <WarehousesSection
        warehouses={warehouses}
        canWrite={canWrite}
        onCreate={async (body) => {
          try {
            await api.createWarehouse(token, body);
            await refresh();
          } catch (err) {
            onError(err, "Failed to create warehouse");
          }
        }}
      />

      <MovesSection moves={moves} />
    </div>
  );
}

function ItemsSection({
  items,
  canWrite,
  onCreate,
}: {
  items: Item[];
  canWrite: boolean;
  onCreate: (body: Partial<Item>) => Promise<void>;
}) {
  const empty = {
    sku: "",
    name: "",
    category: "",
    unit: "",
    price: "",
    reorder_level: "",
  };
  const [form, setForm] = useState(empty);
  const [flags, setFlags] = useState({ is_spare: false, is_tool: false });
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "spare" | "tool">("all");

  const filtered = items.filter((i) => {
    const q = filter.trim().toLowerCase();
    const matchesQ =
      !q ||
      i.sku.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q);
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "spare" && i.is_spare) ||
      (typeFilter === "tool" && i.is_tool);
    return matchesQ && matchesType;
  });

  return (
    <section className="staff-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="staff-card-title" style={{ margin: 0 }}>
          Items
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            className={inputCls}
            placeholder="Filter SKU, name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter items"
          />
          <select
            className="staff-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="spare">Spares</option>
            <option value="tool">Tools</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Unit</th>
              <th className="py-2 pr-4 text-right">Price</th>
              <th className="py-2 pr-4 text-right">Reorder at</th>
              <th className="py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="">
                <td className="py-2 pr-4 font-mono text-xs">{i.sku}</td>
                <td className="py-2 pr-4 font-medium">{i.name}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{i.category ?? "—"}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{i.unit ?? "—"}</td>
                <td className="py-2 pr-4 text-right text-[var(--text)]">
                  ₹{i.price.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right text-[var(--text)]">{i.reorder_level}</td>
                <td className="py-2 text-xs text-[var(--dim)]">
                  {[i.is_spare && "spare", i.is_tool && "tool"]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-[var(--dim)]">
                  {items.length === 0 ? "No items yet." : "No items match the filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <form
          className="grid gap-2 sm:grid-cols-7 pt-2 border-t"
          onSubmit={async (e) => {
            e.preventDefault();
            await onCreate({
              sku: form.sku,
              name: form.name,
              category: form.category || null,
              unit: form.unit || null,
              price: Number(form.price) || 0,
              reorder_level: Number(form.reorder_level) || 0,
              ...flags,
            });
            setForm(empty);
            setFlags({ is_spare: false, is_tool: false });
          }}
        >
          <input required placeholder="SKU" value={form.sku} className={inputCls}
            onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input required placeholder="Name" value={form.name} className={inputCls}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Category" value={form.category} className={inputCls}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input placeholder="Unit" value={form.unit} className={inputCls}
            onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input type="number" min="0" step="0.01" placeholder="Price" value={form.price}
            className={inputCls}
            onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input type="number" min="0" placeholder="Reorder" value={form.reorder_level}
            className={inputCls}
            onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <input type="checkbox" checked={flags.is_spare}
                onChange={(e) => setFlags({ ...flags, is_spare: e.target.checked })} />
              spare
            </label>
            <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <input type="checkbox" checked={flags.is_tool}
                onChange={(e) => setFlags({ ...flags, is_tool: e.target.checked })} />
              tool
            </label>
            <button type="submit" className={buttonCls}>Add</button>
          </div>
        </form>
      )}
    </section>
  );
}

function StockSection({
  stock,
  items,
  warehouses,
  canWrite,
  onAdjust,
  onTransfer,
}: {
  stock: StockLevel[];
  items: Item[];
  warehouses: Warehouse[];
  canWrite: boolean;
  onAdjust: (body: {
    item_id: string;
    warehouse_id: string;
    move_type: "in" | "out";
    quantity: number;
  }) => Promise<void>;
  onTransfer: (body: {
    item_id: string;
    from_warehouse_id: string;
    to_warehouse_id: string;
    quantity: number;
  }) => Promise<void>;
}) {
  const [adjust, setAdjust] = useState({
    item_id: "",
    warehouse_id: "",
    move_type: "in" as "in" | "out",
    quantity: "",
  });
  const [transfer, setTransfer] = useState({
    item_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    quantity: "",
  });

  return (
    <section className="staff-card space-y-4">
      <h2 className="staff-card-title">Stock levels</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Warehouse</th>
              <th className="py-2 pr-4 text-right">On hand</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={`${s.item_id}:${s.warehouse_id}`} className="">
                <td className="py-2 pr-4 font-mono text-xs">{s.sku}</td>
                <td className="py-2 pr-4 text-[var(--text)]">{s.item_name}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{s.warehouse_name}</td>
                <td className="py-2 pr-4 text-right font-medium">
                  {s.quantity}
                </td>
                <td className="py-2">
                  {s.below_reorder && (
                    <span className="staff-badge staff-badge-warn">
                      low stock
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-[var(--dim)]">
                  No stock recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <div className="grid gap-4 lg:grid-cols-2 pt-2 border-t">
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onAdjust({
                item_id: adjust.item_id,
                warehouse_id: adjust.warehouse_id,
                move_type: adjust.move_type,
                quantity: Number(adjust.quantity),
              });
              setAdjust({ ...adjust, quantity: "" });
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--text)]">Adjust stock</h3>
            <div className="flex flex-wrap gap-2">
              <select required value={adjust.item_id} className={`${inputCls} staff-select`}
                onChange={(e) => setAdjust({ ...adjust, item_id: e.target.value })}>
                <option value="">Item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
                ))}
              </select>
              <select required value={adjust.warehouse_id} className={`${inputCls} staff-select`}
                onChange={(e) => setAdjust({ ...adjust, warehouse_id: e.target.value })}>
                <option value="">Warehouse…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <select value={adjust.move_type} className={`${inputCls} staff-select`}
                onChange={(e) =>
                  setAdjust({ ...adjust, move_type: e.target.value as "in" | "out" })
                }>
                <option value="in">in (+)</option>
                <option value="out">out (−)</option>
              </select>
              <input required type="number" min="0.001" step="any" placeholder="Qty"
                value={adjust.quantity} className={`${inputCls} w-24`}
                onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} />
              <button type="submit" className={buttonCls}>Apply</button>
            </div>
          </form>

          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onTransfer({
                item_id: transfer.item_id,
                from_warehouse_id: transfer.from_warehouse_id,
                to_warehouse_id: transfer.to_warehouse_id,
                quantity: Number(transfer.quantity),
              });
              setTransfer({ ...transfer, quantity: "" });
            }}
          >
            <h3 className="text-sm font-semibold text-[var(--text)]">Transfer between warehouses</h3>
            <div className="flex flex-wrap gap-2">
              <select required value={transfer.item_id} className={`${inputCls} staff-select`}
                onChange={(e) => setTransfer({ ...transfer, item_id: e.target.value })}>
                <option value="">Item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
                ))}
              </select>
              <select required value={transfer.from_warehouse_id} className={`${inputCls} staff-select`}
                onChange={(e) =>
                  setTransfer({ ...transfer, from_warehouse_id: e.target.value })
                }>
                <option value="">From…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <select required value={transfer.to_warehouse_id} className={`${inputCls} staff-select`}
                onChange={(e) =>
                  setTransfer({ ...transfer, to_warehouse_id: e.target.value })
                }>
                <option value="">To…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <input required type="number" min="0.001" step="any" placeholder="Qty"
                value={transfer.quantity} className={`${inputCls} w-24`}
                onChange={(e) => setTransfer({ ...transfer, quantity: e.target.value })} />
              <button type="submit" className={buttonCls}>Transfer</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function WarehousesSection({
  warehouses,
  canWrite,
  onCreate,
}: {
  warehouses: Warehouse[];
  canWrite: boolean;
  onCreate: (body: { name: string; location?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", location: "" });

  return (
    <section className="staff-card space-y-4">
      <h2 className="staff-card-title">Warehouses</h2>
      <ul className="text-sm text-[var(--text)] space-y-1">
        {warehouses.map((w) => (
          <li key={w.id}>
            <span className="font-medium">{w.name}</span>
            {w.location && <span className="text-[var(--dim)]"> — {w.location}</span>}
          </li>
        ))}
        {warehouses.length === 0 && (
          <li className="text-[var(--dim)]">No warehouses yet.</li>
        )}
      </ul>
      {canWrite && (
        <form
          className="flex flex-wrap gap-2 pt-2 border-t"
          onSubmit={async (e) => {
            e.preventDefault();
            await onCreate({ name: form.name, location: form.location || undefined });
            setForm({ name: "", location: "" });
          }}
        >
          <input required placeholder="Name" value={form.name} className={inputCls}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Location" value={form.location} className={inputCls}
            onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <button type="submit" className={buttonCls}>Add warehouse</button>
        </form>
      )}
    </section>
  );
}

function MovesSection({ moves }: { moves: StockMove[] }) {
  return (
    <section className="staff-card space-y-4">
      <h2 className="staff-card-title">Recent stock moves</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Warehouse</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4 text-right">Qty</th>
              <th className="py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id} className="">
                <td className="py-2 pr-4 text-[var(--dim)] whitespace-nowrap">
                  {new Date(m.created_at).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-[var(--text)]">
                  <span className="font-mono text-xs text-[var(--dim)]">{m.sku}</span>{" "}
                  {m.item_name}
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">{m.warehouse_name}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{m.move_type}</td>
                <td
                  className={`py-2 pr-4 text-right font-medium ${
                    m.quantity < 0 ? "text-[var(--danger)]" : "text-[var(--ok)]"
                  }`}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="py-2 text-[var(--muted)]">{m.created_by_name}</td>
              </tr>
            ))}
            {moves.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-[var(--dim)]">
                  No stock movements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
