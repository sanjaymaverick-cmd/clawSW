import { CatalogItem, fetchPublic } from "../../lib/api";
import CatalogClient from "./CatalogClient";
import PageIntro from "../components/PageIntro";
import EmptyState from "../components/EmptyState";

// Catalog prices/availability must always be current, never prerendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Spares & Tools — Sanjay Wood Tech",
  description: "Genuine spares and tools catalog with online ordering.",
};

export default async function CatalogPage() {
  const items = await fetchPublic<CatalogItem[]>("/catalog");
  return (
    <>
      <PageIntro
        eyebrow="Spares & Tools"
        title="Genuine spares & tools,"
        highlight="for the machines we supply."
        description="Set quantities on what you need and place an order online — we confirm price and availability by phone or email before dispatch."
      />

      <section className="container" style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}>
        <div className="trust-strip" aria-label="Why order spares with us">
          <span className="trust-strip-item">Genuine, machine-matched spares</span>
          <span className="trust-strip-item">Sourced for your model</span>
          <span className="trust-strip-item">Confirmed before dispatch</span>
          <span className="trust-strip-item">Pan-India service support</span>
        </div>

        {items === null ? (
          <EmptyState
            icon="⚡"
            title="Catalog temporarily unavailable"
            description="We could not reach the live inventory feed. Try again in a moment, or contact us for urgent spares."
            actionLabel="Contact us"
            actionHref="/contact"
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="◇"
            title="No products published yet"
            description="New spares and tools will appear here as soon as they are listed. Browse machinery in the meantime."
            actionLabel="Explore machines"
            actionHref="/machinery"
          />
        ) : (
          <CatalogClient items={items} />
        )}
      </section>
    </>
  );
}
