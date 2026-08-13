import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIndustry,
  industries,
} from "../../../lib/content";
import PageIntro from "../../components/PageIntro";
import Reveal from "../../components/Reveal";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ind = getIndustry(slug);
  if (!ind) return { title: "Industry — Sanjay Wood Tech" };
  return {
    title: `${ind.name} — Sanjay Wood Tech`,
    description: ind.description || undefined,
  };
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const ind = getIndustry(slug);
  if (!ind) notFound();

  const skipHeadings = new Set([
    "furniture",
    "modular kitchen",
    "door & window",
    "plywood & panel",
    "metal fabrication",
    "why choose us?",
    "recommended machines",
  ]);
  const contentSections = (ind.sections || []).filter((s) => {
    const h = (s.heading || "").toLowerCase();
    if (h && skipHeadings.has(h)) return false;
    return Boolean(
      (s.paragraphs && s.paragraphs.length > 0) ||
        (s.items && s.items.length > 0) ||
        s.heading
    );
  });

  return (
    <>
      <PageIntro
        eyebrow="Industry"
        title={ind.name}
        highlight=""
        description={ind.description || "Machinery solutions tailored to this sector."}
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 800 }}>
          {contentSections.slice(0, 12).map((s, i) => (
            <Reveal key={`${s.heading}-${i}`} delay={(i % 4) * 40}>
              <div className="card">
                {s.heading && (
                  <h2 className="h3" style={{ fontSize: "1.15rem", marginBottom: 12 }}>
                    {s.heading}
                  </h2>
                )}
                {(s.paragraphs || []).map((p) => (
                  <p key={p.slice(0, 32)} className="muted" style={{ marginTop: 8, fontSize: "0.95rem" }}>
                    {p}
                  </p>
                ))}
                {(s.items || []).length > 0 && (
                  <ul style={{ marginTop: 12, paddingLeft: 18 }}>
                    {s.items.map((it) => (
                      <li key={it} className="muted" style={{ marginTop: 6 }}>
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        {ind.images.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
              marginTop: 40,
            }}
          >
            {ind.images.slice(0, 9).map((im) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={im.src}
                src={im.src}
                alt={im.alt || ind.name}
                loading="lazy"
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  objectFit: "cover",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border)",
                }}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link href="/machinery" className="btn btn-primary btn-lg">
            Browse machinery
          </Link>
          <Link href="/book-demo" className="btn btn-ghost btn-lg">
            Book a demo
          </Link>
          <Link href="/industries" className="btn btn-wood btn-lg">
            All industries
          </Link>
        </div>
      </section>
    </>
  );
}
