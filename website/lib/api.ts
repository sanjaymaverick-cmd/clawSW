// Server components fetch over the internal compose network (API_URL,
// e.g. http://api:8000); the browser talks to the API's published port
// (NEXT_PUBLIC_API_URL, inlined at build time).
export const SERVER_API_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const BROWSER_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
