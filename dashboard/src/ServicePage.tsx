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
import { Badge, Button, Card } from "./ui";

const STATUS_TONE: Record<
  ServiceJob["status"],
  "neutral" | "info" | "ok" | "wood"
> = {
  open: "neutral",
  in_progress: "info",
  completed: "ok",
  billed: "wood",
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | ServiceJob["status"]
  >("all");
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
      {error && <p className="staff-alert staff-alert-error">{error}</p>}

      {canWrite && !isTechnician && (
        <Card title="New service job">
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
                setForm({
                  customer_name: "",
                  assigned_technician_id: "",
                  description: "",
                });
                await refresh();
              } catch (err) {
                onError(err, "Failed to create job");
              }
            }}
          >
            <input
              required
              placeholder="Customer"
              value={form.customer_name}
              className="staff-input"
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
            <select
              required
              value={form.assigned_technician_id}
              className="staff-select"
              onChange={(e) =>
                setForm({ ...form, assigned_technician_id: e.target.value })
              }
            >
              <option value="">Assign to…</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Description"
              value={form.description}
              className="staff-input flex-1 min-w-40"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Button type="submit" variant="primary">
              Create
            </Button>
          </form>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {isTechnician ? "My jobs" : "Service jobs"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["in_progress", "In progress"],
                ["completed", "Completed"],
                ["billed", "Billed"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`staff-btn ${statusFilter === key ? "staff-btn-primary" : ""}`}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {jobs.length === 0 && (
          <p style={{ fontSize: "0.875rem", color: "var(--dim)" }}>
            No service jobs yet.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {jobs
            .filter((j) => statusFilter === "all" || j.status === statusFilter)
            .map((job) => (
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
        {jobs.length > 0 &&
          jobs.filter((j) => statusFilter === "all" || j.status === statusFilter)
            .length === 0 && (
            <p style={{ fontSize: "0.875rem", color: "var(--dim)" }}>
              No jobs with this status.
            </p>
          )}
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
    <div className="staff-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>
            {job.customer_name}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--dim)" }}>
            {job.technician_name} · {new Date(job.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge tone={STATUS_TONE[job.status]}>
          {job.status.replace("_", " ")}
        </Badge>
      </div>

      {job.description && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>
          {job.description}
        </p>
      )}

      {parts && parts.length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            fontSize: "0.875rem",
            color: "var(--muted)",
          }}
        >
          {parts.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
              }}
            >
              <span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.75rem",
                    color: "var(--dim)",
                  }}
                >
                  {p.sku}
                </span>{" "}
                {p.item_name}
              </span>
              <span style={{ color: "var(--dim)" }}>
                {p.quantity} {p.unit ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canAddParts && (
        <form
          className="flex flex-wrap gap-2 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
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
          <select
            required
            value={partForm.item_id}
            className="staff-select flex-1 min-w-32"
            onChange={(e) => setPartForm({ ...partForm, item_id: e.target.value })}
          >
            <option value="">Part used…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.sku} — {i.name}
              </option>
            ))}
          </select>
          <select
            required
            value={partForm.warehouse_id}
            className="staff-select"
            onChange={(e) =>
              setPartForm({ ...partForm, warehouse_id: e.target.value })
            }
          >
            <option value="">From…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min="0.001"
            step="any"
            placeholder="Qty"
            value={partForm.quantity}
            className="staff-input w-20"
            onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })}
          />
          <Button type="submit" variant="primary">
            Use
          </Button>
        </form>
      )}

      {showAdvance && next && (
        <Button
          style={{ width: "100%" }}
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
        </Button>
      )}
    </div>
  );
}
