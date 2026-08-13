// Server components fetch over the internal compose network (API_URL,
// e.g. http://api:8000); the browser talks via NEXT_PUBLIC_API_URL
// (typically `/api` through the gateway, same origin as the site).

function resolveServerApiUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  const pub = process.env.NEXT_PUBLIC_API_URL;
  // Relative paths like `/api` only work in the browser behind the gateway.
  if (pub && (pub.startsWith("http://") || pub.startsWith("https://"))) {
    return pub;
  }
  return "http://localhost:8000";
}

export const SERVER_API_URL = resolveServerApiUrl();

/** Browser-facing API base. Gateway default: `/api`. Split-dev: full URL. */
export const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/** Where staff land after login. Gateway default: `/app/`. */
export const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "/app/";

/** localStorage key — must match dashboard/src/App.tsx */
export const STAFF_TOKEN_KEY = "clawsw_token";

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string | null;
  price: number;
  is_spare: boolean;
  is_tool: boolean;
  description: string | null;
  image_path: string | null;
  in_stock: boolean;
}

export interface Machinery {
  id: string;
  name: string;
  brochure_path: string | null;
  category: string | null;
}

export interface CompletedProject {
  id: string;
  title: string;
  description: string | null;
  image_paths: string[] | null;
  client_name: string | null;
  date_completed: string | null;
}

export async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const resp = await fetch(`${SERVER_API_URL}/public${path}`, {
      cache: "no-store",
    });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

/**
 * After a successful staff login, store the JWT and send the user to the
 * dashboard. Same-origin (gateway): localStorage is shared with /app.
 * Cross-origin (split dev): pass the token in the URL hash once.
 */
export function enterStaffDashboard(accessToken: string): void {
  const dest = DASHBOARD_URL.endsWith("/") ? DASHBOARD_URL : `${DASHBOARD_URL}/`;
  let crossOrigin = false;
  try {
    if (/^https?:\/\//i.test(dest)) {
      const target = new URL(dest, window.location.href);
      crossOrigin = target.origin !== window.location.origin;
    }
  } catch {
    crossOrigin = false;
  }

  if (crossOrigin) {
    const base = dest.replace(/#.*$/, "");
    const joiner = base.includes("#") ? "&" : "#";
    window.location.href = `${base}${joiner}clawsw_token=${encodeURIComponent(accessToken)}`;
    return;
  }

  localStorage.setItem(STAFF_TOKEN_KEY, accessToken);
  window.location.href = dest;
}
