import { useCallback, useEffect, useState } from "react";
import { api, ApiError, UserRow } from "./api";

const ROLES = [
  "owner",
  "manager",
  "accountant",
  "service_manager",
  "technician",
  "warehouse",
];

export default function UsersPanel({
  token,
  canWrite,
  selfId,
}: {
  token: string;
  canWrite: boolean;
  selfId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "technician",
  });

  const refresh = useCallback(async () => {
    try {
      setUsers(await api.listUsers(token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createUser(token, form);
      setForm({ name: "", email: "", password: "", role: "technician" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api.setUserActive(token, u.id, !u.active);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    }
  }

  return (
    <section className="staff-card p-6 space-y-4">
      <h2 className="staff-card-title">Users</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--dim)] border-b border-[var(--border)]">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              {canWrite && <th className="py-2" />}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 font-medium text-[var(--text)]">{u.name}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{u.email}</td>
                <td className="py-2 pr-4">
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
                    {u.role}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {u.active ? (
                    <span className="text-green-700">active</span>
                  ) : (
                    <span className="text-[var(--dim)]">deactivated</span>
                  )}
                </td>
                {canWrite && (
                  <td className="py-2 text-right">
                    {u.id !== selfId && (
                      <button
                        onClick={() => void toggleActive(u)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <form onSubmit={createUser} className="grid gap-2 sm:grid-cols-5 pt-2 border-t border-[var(--border)]">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Password (min 8)"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-md border border-[var(--border-strong)] px-2 py-1.5 text-sm bg-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md staff-btn staff-btn-primary"
          >
            Add user
          </button>
        </form>
      )}
    </section>
  );
}
