import { useCallback, useEffect, useState } from "react";
import { api, Me } from "./api";
import DashboardPage from "./DashboardPage";
import InventoryPage from "./InventoryPage";
import Login from "./Login";
import ServicePage from "./ServicePage";
import UsersPanel from "./UsersPanel";

const TOKEN_KEY = "clawsw_token";
type Tab = "dashboard" | "overview" | "inventory" | "service" | "users";

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [tab, setTab] = useState<Tab>("overview");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api
      .me(token)
      .then((m) => {
        if (cancelled) return;
        setMe(m);
        // Land on the dashboard when the role can see it.
        if (
          m.permissions.some(
            (p) => p.resource === "reports" && p.action === "read",
          )
        ) {
          setTab((prev) => (prev === "overview" ? "dashboard" : prev));
        }
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  if (!token) {
    return (
      <Login
        onToken={(t) => {
          localStorage.setItem(TOKEN_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  if (loading || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        Loading…
      </div>
    );
  }

  const can = (resource: string, action: string) =>
    me.permissions.some((p) => p.resource === resource && p.action === action);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-slate-800">clawSW</span>
            <span className="text-sm text-slate-500">internal dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {me.name}{" "}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {me.role}
              </span>
            </span>
            <button
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="mx-auto max-w-5xl px-4 pt-4">
        <div className="flex gap-1">
          {(
            [
              ["dashboard", "Dashboard", can("reports", "read")],
              ["overview", "Overview", true],
              ["inventory", "Inventory", can("inventory", "read")],
              ["service", "Service", can("service_jobs", "read")],
              ["users", "Users", can("admin", "read")],
            ] as [Tab, string, boolean][]
          )
            .filter(([, , visible]) => visible)
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {tab === "dashboard" && can("reports", "read") && (
          <DashboardPage token={token} />
        )}

        {tab === "overview" && (
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800">Your access</h2>
            <p className="text-sm text-slate-500 mb-3">
              Granted by the permissions table for role “{me.role}”.
            </p>
            <div className="flex flex-wrap gap-2">
              {me.permissions.map((p) => (
                <span
                  key={`${p.resource}:${p.action}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {p.resource}:{p.action}
                </span>
              ))}
            </div>
          </section>
        )}

        {tab === "inventory" && can("inventory", "read") && (
          <InventoryPage token={token} canWrite={can("inventory", "write")} />
        )}

        {tab === "service" && can("service_jobs", "read") && (
          <ServicePage
            token={token}
            canWrite={can("service_jobs", "write")}
            isTechnician={me.role === "technician"}
          />
        )}

        {tab === "users" && can("admin", "read") && (
          <UsersPanel token={token} canWrite={can("admin", "write")} selfId={me.id} />
        )}
      </main>
    </div>
  );
}
