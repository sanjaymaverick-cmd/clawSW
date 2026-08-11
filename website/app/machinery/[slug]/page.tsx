import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProduct,
  getRelatedProducts,
  products,
  company,
} from "../../../lib/content";
import Reveal from "../../components/Reveal";
import {
  getMachineByProductSlug,
  getMachine,
} from "../../../data/machines";
import MachineExplorerClient from "../../../components/3d/MachineExplorerClient";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Machine — Sanjay Wood Tech" };
  return {
    title: `${p.name} — Sanjay Wood Tech`,
    description: p.description || p.summary || undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = getRelatedProducts(product, 4);
  const phone = company.phones[0]?.replace(/\s/g, "") ?? "";
  const machine3d =
    getMachineByProductSlug(product.slug) ?? getMachine(product.slug) ?? null;

  return (
    <>
      <section
        className="container"
        style={{ paddingTop: 40, paddingBottom: 24 }}
      >
        <Link
          href="/machinery"
          className="muted"
          style={{ fontSize: "0.9rem" }}
        >
          ← All machinery
        </Link>
      </section>

      <section
        className="container product-hero"
        style={{
          display: "grid",
          gap: 40,
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          alignItems: "start",
          paddingBottom: 48,
        }}
      >
        {/* Gallery / 3D */}
        <div>
          {machine3d ? (
            <div style={{ marginBottom: 12 }}>
              <MachineExplorerClient machine={machine3d} height={420} />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={`/products/${machine3d.id}`}
                  className="btn btn-ghost"
                  style={{ padding: "10px 14px", fontSize: "0.85rem" }}
                >
                  Open full 3D explorer
                </Link>
                <Link
                  href="/floor-planner"
                  className="btn btn-wood"
                  style={{ padding: "10px 14px", fontSize: "0.85rem" }}
                >
                  Place on floor plan
                </Link>
              </div>
            </div>
          ) : (
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              aspectRatio: "4 / 3",
              background: "var(--surface-2)",
            }}
          >
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--text-dim)",
                }}
              >
                No image
              </div>
            )}
          </div>
          )}
          {product.images.length > 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
                gap: 10,
                marginTop: 12,
              }}
            >
              {product.images.slice(0, 8).map((im) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={im.src}
                  src={im.src}
                  alt={im.alt || product.name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Copy */}
        <div>
          <div
            className="pill-note"
            style={{
              color: "var(--wood)",
              borderColor: "rgba(224,164,90,0.3)",
              background: "rgba(224,164,90,0.08)",
              display: "inline-flex",
              marginBottom: 14,
            }}
          >
            {product.category}
            {product.is_new ? " · New launch" : ""}
          </div>
          <h1 className="h2" style={{ marginBottom: 16 }}>
            {product.name}
          </h1>
          {product.model && (
            <p className="dim" style={{ marginBottom: 16 }}>
              Model {product.model}
            </p>
          )}
          {product.description && (
            <p className="lead" style={{ marginBottom: 28, maxWidth: "52ch" }}>
              {product.description}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/book-demo" className="btn btn-primary btn-lg">
              Request a demo
            </Link>
            <a
              href={`mailto:${company.emails[0]}?subject=${encodeURIComponent("Enquiry: " + product.name)}`}
              className="btn btn-ghost btn-lg"
            >
              Email enquiry
            </a>
            {phone && (
              <a href={`tel:${phone}`} className="btn btn-wood btn-lg">
                Call {company.phones[0]}
              </a>
            )}
          </div>
        </div>
      </section>

      {(product.features.length > 0 || product.body.length > 0) && (
        <section
          className="container"
          style={{ paddingBottom: "clamp(48px, 8vw, 96px)" }}
        >
          <div
            style={{
              display: "grid",
              gap: 28,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            {product.features.length > 0 && (
              <Reveal>
                <div className="card" style={{ height: "100%" }}>
                  <h2 className="h3" style={{ marginBottom: 18 }}>
                    Key features
                  </h2>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {product.features.map((f) => (
                      <li key={f} className="muted" style={{ fontSize: "0.95rem" }}>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
            {product.body.length > 0 && (
              <Reveal delay={80}>
                <div className="card" style={{ height: "100%" }}>
                  <h2 className="h3" style={{ marginBottom: 18 }}>
                    Overview
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {product.body.slice(0, 5).map((para) => (
                      <p key={para.slice(0, 40)} className="muted" style={{ fontSize: "0.95rem" }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section
          className="container"
          style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
        >
          <h2 className="h3" style={{ marginBottom: 22 }}>
            Related machines
          </h2>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {related.map((r) => (
              <Link key={r.slug} href={`/machinery/${r.slug}`} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ aspectRatio: "16/10", background: "var(--surface-2)" }}>
                  {r.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image}
                      alt={r.name}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <div className="dim" style={{ fontSize: "0.75rem", marginBottom: 6 }}>
                    {r.category}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{r.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <style>{`
        @media (max-width: 900px) {
          .product-hero { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
