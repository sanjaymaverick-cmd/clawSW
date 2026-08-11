import Link from "next/link";
import PageIntro from "../components/PageIntro";
import Reveal from "../components/Reveal";
import { industries } from "../../lib/content";

export const metadata = {
  title: "Industries We Serve — Sanjay Wood Tech",
  description:
    "Machinery solutions for furniture, modular kitchen, door & window, plywood, metal fabrication, and stone processing.",
};

export default function IndustriesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Industries"
        title="Powering production across"
        highlight="every workshop."
        description="From solid wood furniture to panel plants and metal fabrication — we supply and commission the machines each industry needs."
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {industries.map((ind, i) => (
            <Reveal key={ind.slug} delay={(i % 3) * 70}>
              <Link
                href={`/industries/${ind.slug}`}
                className="card"
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 200,
                }}
              >
                <h2 className="h3" style={{ fontSize: "1.2rem" }}>
                  {ind.name}
                </h2>
                {ind.description && (
                  <p
                    className="muted"
                    style={{
                      marginTop: 12,
                      fontSize: "0.92rem",
                      flex: 1,
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {ind.description}
                  </p>
                )}
                <div
                  style={{
                    marginTop: 20,
                    color: "var(--wood)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  Explore solutions →
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
