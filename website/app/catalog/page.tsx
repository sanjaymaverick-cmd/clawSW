import { CatalogItem, fetchPublic } from "../../lib/api";
import CatalogClient from "./CatalogClient";

// Catalog prices/availability must always be current, never prerendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Spares & Tools — clawSW",
  description: "Genuine spares and tools catalog with online ordering.",
};

export default async function CatalogPage() {
  const items = await fetchPublic<CatalogItem[]>("/catalog");
  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Spares &amp; Tools</h1>
      {items === null ? (
        <p style={{ color: "#64748b" }}>
          The catalog is temporarily unavailable. Please try again shortly.
        </p>
      ) : items.length === 0 ? (
        <p style={{ color: "#64748b" }}>No products published yet.</p>
      ) : (
        <CatalogClient items={items} />
      )}
    </main>
  );
}
