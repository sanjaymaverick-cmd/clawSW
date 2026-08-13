import { useCallback, useEffect, useState } from "react";
import { api, Me } from "./api";
import AuditPage from "./AuditPage";
import DashboardPage from "./DashboardPage";
import InventoryPage from "./InventoryPage";
import Login from "./Login";
import ServicePage from "./ServicePage";
import TallyPage from "./TallyPage";
import UsersPanel from "./UsersPanel";
import WebsitePage from "./WebsitePage";
import ImportsPage from "./ImportsPage";
import ProjectsPage from "./ProjectsPage";
import { Badge, Button, ToastProvider } from "./ui";
import CommandPalette, { CommandItem } from "./ui/CommandPalette";

const TOKEN_KEY = "clawsw_token";
/** Public marketing site (gateway serves it at /). */
const PUBLIC_SITE =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "/";

type Tab =
  | "dashboard"
  | "overview"
  | "inventory"
  | "service"
  | "invoicing"
  | "website"
  | "imports"
  | "projects"
  | "users"
  | "audit";

const TAB_LABELS: Record<Tab, string> = {
  dashboard: "Dashboard",
  overview: "Overview",
  inventory: "Inventory",
  service: "Service",
  invoicing: "Invoicing",
  website: "Website orders",
  imports: "Imports",
  projects: "Projects",
  users: "Users",
  audit: "Audit",
};

function tabLabel(tab: Tab, role: string) {
  if (tab === "dashboard" && role === "owner") return "CEO Dashboard";
  return TAB_LABELS[tab];
}

/** One-time handoff from the website login when origins differ (split dev). */
function consumeHashToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw.includes("=") ? raw : `token=${raw}`);
  const fromKey = params.get("clawsw_token") || params.get("token");
  if (!fromKey) return null;
  try {
    localStorage.setItem(TOKEN_KEY, fromKey);
  } catch {
    /* ignore quota / private mode */
  }
  const path = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", path);
  return fromKey;
}

function initialToken(): string | null {
  const handed = consumeHashToken();
  if (handed) return handed;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function canPerm(me: Me, resource: string, action: string) {
  return me.permissions.some((p) => p.resource === resource && p.action === action);
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => initialToken());
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      <ToastProvider>
        <Login
          onToken={(t) => {
            localStorage.setItem(TOKEN_KEY, t);
            setToken(t);
          }}
        />
      </ToastProvider>
    );
  }

  if (loading || !me) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ color: "var(--muted)" }}
      >
        Loading…
      </div>
    );
  }

  const can = (resource: string, action: string) => canPerm(me, resource, action);

  const navItems = (
    [
      ["dashboard", "Dashboard", can("reports", "read")],
      ["overview", "Overview", true],
      ["inventory", "Inventory", can("inventory", "read")],
      ["service", "Service", can("service_jobs", "read")],
      ["imports", "Imports", can("imports", "read")],
      ["projects", "Projects", can("projects", "read")],
      ["invoicing", "Invoicing", can("invoices", "read")],
      ["website", "Website", can("website", "read")],
      ["users", "Users", can("admin", "read")],
      ["audit", "Audit", can("admin", "read")],
    ] as [Tab, string, boolean][]
  ).filter(([, , visible]) => visible);

  const go = (key: Tab) => {
    setTab(key);
    setSidebarOpen(false);
  };

  const commands: CommandItem[] = navItems.map(([key, label]) => ({
    id: key,
    label,
    hint: "Go to",
    run: () => go(key),
  }));

  return (
    <ToastProvider>
    <div className="staff-shell">
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={commands}
      />
      {sidebarOpen && (
        <div
          className="staff-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`staff-sidebar ${sidebarOpen ? "is-open" : ""}`}
        aria-label="Staff navigation"
      >
        <div className="staff-sidebar-brand">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(140deg, rgba(224,164,90,0.35), rgba(224,164,90,0.08))",
              border: "1px solid rgba(224,164,90,0.35)",
              display: "grid",
              placeItems: "center",
              color: "var(--wood)",
              fontWeight: 800,
              fontSize: "0.85rem",
              flexShrink: 0,
            }}
          >
            SW
          </div>
          <div>
            <strong>Sanjay Wood Tech</strong>
            <span>Staff</span>
          </div>
        </div>

        <nav className="staff-nav">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              className={`staff-nav-btn ${tab === key ? "is-active" : ""}`}
            >
              {key === "dashboard" && me.role === "owner" ? "CEO Dashboard" : label}
            </button>
          ))}
        </nav>

        <div className="staff-sidebar-foot">
          <a
            href={PUBLIC_SITE}
            className="staff-btn staff-btn-ghost"
            style={{ justifyContent: "flex-start", textDecoration: "none" }}
          >
            ← Public site
          </a>
        </div>
      </aside>

      <div className="staff-main-col">
        <header className="staff-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="staff-mobile-toggle"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
            <div className="staff-topbar-title">{tabLabel(tab, me.role)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              variant="ghost"
              onClick={() => setCmdOpen(true)}
              style={{ padding: "6px 10px", fontSize: "0.8rem", color: "var(--dim)" }}
              title="Command palette (Ctrl+K)"
            >
              ⌘K
            </Button>
            <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
              {me.name}
            </span>
            <Badge tone="wood">{me.role}</Badge>
            <Button variant="ghost" onClick={logout} style={{ padding: "6px 10px" }}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="staff-content space-y-6">
          {tab === "dashboard" && can("reports", "read") && (
            <DashboardPage token={token} role={me.role} onNavigate={go} />
          )}

          {tab === "overview" && (
            <section className="staff-card">
              <h2 className="staff-card-title">Your access</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: "0 0 12px" }}>
                Granted by the permissions table for role “{me.role}”.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {me.permissions.map((p) => (
                  <Badge key={`${p.resource}:${p.action}`} tone="neutral">
                    {p.resource}:{p.action}
                  </Badge>
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

          {tab === "invoicing" && can("invoices", "read") && (
            <TallyPage token={token} canWrite={can("invoices", "write")} />
          )}

          {tab === "website" && can("website", "read") && (
            <WebsitePage token={token} canWrite={can("website", "write")} />
          )}

          {tab === "imports" && can("imports", "read") && (
            <ImportsPage token={token} canWrite={can("imports", "write")} />
          )}

          {tab === "projects" && can("projects", "read") && (
            <ProjectsPage token={token} canWrite={can("projects", "write")} />
          )}

          {tab === "users" && can("admin", "read") && (
            <UsersPanel token={token} canWrite={can("admin", "write")} selfId={me.id} />
          )}

          {tab === "audit" && can("admin", "read") && <AuditPage token={token} />}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
