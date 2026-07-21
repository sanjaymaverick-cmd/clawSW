import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  Item,
  JobPart,
  ServiceJob,
  Technician,
  Warehouse,
} from "./api";

const inputCls = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";
const buttonCls =
  "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";

const STATUS_STYLE: Record<ServiceJob["status"], string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  billed: "bg-purple-50 text-purple-700",
};

const NEXT_STATUS: Partial<
  Record<ServiceJob["status"], { to: string; label: string }>
> = {
  open: { to: "in_progress", label: "Start job" },
  in_progress: { to: "completed", label: "Mark completed" },
  completed: { to: "billed", label: "Mark billed" },
};

export default function ServicePage({
  token,
  canWrite,
  isTechnician,
}: {
  token: string;
  canWrite: boolean;
  isTechnician: boolean;
}) {
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    assigned_technician_id: "",
    description: "",
  });

  const refresh = useCallback(async () => {
    try {
      const [j, i, w] = await Promise.all([
        api.listServiceJobs(token),
        api.listItems(token),
        api.listWarehouses(token),
      ]);
      setJobs(j);
      setItems(i);
      setWarehouses(w);
      if (canWrite && !isTechnician) {
        setTechnicians(await api.listTechnicians(token));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load service jobs");
    }
  }, [token, canWrite, isTechnician]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onError = (err: unknown, fallback: string) =>
    setError(err instanceof ApiError ? err.message : fallback);

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {canWrite && !isTechnician && (
        <section className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">New service job</h2>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createServiceJob(token, {
                  customer_name: form.customer_name,
                  assigned_technician_id: form.assigned_technician_id,
                  description: form.description || undefined,
                });
                setForm({ customer_name: "", assigned_technician_id: "", description: "" });
                await refresh();
              } catch (err) {
                onError(err, "Failed to create job");
              }
            }}
          >
            <input required placeholder="Customer" value={form.customer_name}
              className={inputCls}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <select required value={form.assigned_technician_id}
              className={`${inputCls} bg-white`}
              onChange={(e) =>
                setForm({ ...form, assigned_technician_id: e.target.value })
              }>
              <option value="">Assign to…</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input placeholder="Description" value={form.description}
              className={`${inputCls} flex-1 min-w-40`}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button type="submit" className={buttonCls}>Create</button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {isTechnician ? "My jobs" : "Service jobs"}
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-slate-400">No service jobs yet.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              token={token}
              job={job}
              items={items}
              warehouses={warehouses}
              canWrite={canWrite}
              isTechnician={isTechnician}
              onChanged={refresh}
              onError={onError}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function JobCard({
  token,
  job,
  items,
  warehouses,
  canWrite,
  isTechnician,
  onChanged,
  onError,
}: {
  token: string;
  job: ServiceJob;
  items: Item[];
  warehouses: Warehouse[];
  canWrite: boolean;
  isTechnician: boolean;
  onChanged: () => Promise<void>;
  onError: (err: unknown, fallback: string) => void;
}) {
  const [parts, setParts] = useState<JobPart[] | null>(null);
  const [partForm, setPartForm] = useState({
    item_id: "",
    warehouse_id: "",
    quantity: "",
  });

  const loadParts = useCallback(async () => {
    try {
      setParts(await api.listJobParts(token, job.id));
    } catch (err) {
      onError(err, "Failed to load parts");
    }
  }, [token, job.id, onError]);

  useEffect(() => {
    void loadParts();
  }, [loadParts]);

  const next = NEXT_STATUS[job.status];
  const showAdvance =
    canWrite && next && !(isTechnician && next.to === "billed");
  const canAddParts =
    canWrite && (job.status === "open" || job.status === "in_progress");

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">{job.customer_name}</h3>
          <p className="text-xs text-slate-500">
            {job.technician_name} · {new Date(job.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[job.status]}`}
        >
          {job.status.replace("_", " ")}
        </span>
      </div>

      {job.description && (
        <p className="text-sm text-slate-600">{job.description}</p>
      )}

      {parts && parts.length > 0 && (
        <ul className="text-sm text-slate-700 space-y-0.5">
          {parts.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>
                <span className="font-mono text-xs text-slate-500">{p.sku}</span>{" "}
                {p.item_name}
              </span>
              <span className="text-slate-500">
                {p.quantity} {p.unit ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canAddParts && (
        <form
          className="flex flex-wrap gap-2 pt-2 border-t border-slate-100"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.addJobPart(token, job.id, {
                item_id: partForm.item_id,
                warehouse_id: partForm.warehouse_id,
                quantity: Number(partForm.quantity),
              });
              setPartForm({ item_id: "", warehouse_id: "", quantity: "" });
              await loadParts();
            } catch (err) {
              onError(err, "Failed to add part");
            }
          }}
        >
          <select required value={partForm.item_id}
            className={`${inputCls} bg-white flex-1 min-w-32`}
            onChange={(e) => setPartForm({ ...partForm, item_id: e.target.value })}>
            <option value="">Part used…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
            ))}
          </select>
          <select required value={partForm.warehouse_id}
            className={`${inputCls} bg-white`}
            onChange={(e) =>
              setPartForm({ ...partForm, warehouse_id: e.target.value })
            }>
            <option value="">From…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <input required type="number" min="0.001" step="any" placeholder="Qty"
            value={partForm.quantity} className={`${inputCls} w-20`}
            onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })} />
          <button type="submit" className={buttonCls}>Use</button>
        </form>
      )}

      {showAdvance && next && (
        <button
          className="w-full rounded-md border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          onClick={async () => {
            try {
              await api.updateServiceJob(token, job.id, { status: next.to });
              await onChanged();
            } catch (err) {
              onError(err, "Failed to update status");
            }
          }}
        >
          {next.label}
        </button>
      )}
    </div>
  );
}
