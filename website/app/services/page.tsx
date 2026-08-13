import Link from "next/link";
import PageIntro from "../components/PageIntro";
import Reveal from "../components/Reveal";
import { company } from "../../lib/content";
import { IconService, IconShield, IconTool, IconSpark } from "../components/icons";

export const metadata = {
  title: "Our Services — Sanjay Wood Tech",
  description:
    "Factory consulting, machine installation, operator training, and pan-India after-sales support for woodworking machinery.",
};

const icons = [IconService, IconTool, IconShield, IconSpark];

export default function ServicesPage() {
  const core = company.services.slice(0, 12);

  return (
    <>
      <PageIntro
        eyebrow="Services"
        title="Beyond supply —"
        highlight="full technical partnership."
        description="We go beyond machinery supply. Our technical team handles factory layout, installation, training, and handover so your line runs from day one."
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {core.map((s, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={s.title} delay={(i % 4) * 60}>
                <div className="card" style={{ height: "100%" }}>
                  <div className="chip">
                    <Icon />
                  </div>
                  <h2
                    className="h3"
                    style={{ marginTop: 18, fontSize: "1.15rem" }}
                  >
                    {s.title}
                  </h2>
                  {s.description && (
                    <p className="muted" style={{ marginTop: 12, fontSize: "0.92rem" }}>
                      {s.description}
                    </p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {company.faqs.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <Reveal style={{ marginBottom: 28, maxWidth: 560 }}>
              <span className="eyebrow">FAQ</span>
              <h2 className="h2" style={{ marginTop: 14 }}>
                Common questions from factory owners.
              </h2>
            </Reveal>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {company.faqs.map((f, i) => (
                <Reveal key={f.question} delay={(i % 5) * 40}>
                  <details className="card" style={{ padding: "18px 22px" }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        fontWeight: 600,
                        fontFamily: "var(--font-sora), sans-serif",
                        listStyle: "none",
                      }}
                    >
                      {f.question}
                    </summary>
                    <p className="muted" style={{ marginTop: 12, fontSize: "0.95rem" }}>
                      {f.answer}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        <Reveal
          className="card"
          style={{
            marginTop: 56,
            textAlign: "center",
            padding: "clamp(36px, 6vw, 56px) 24px",
          }}
        >
          <h2 className="h2">Plan your next installation</h2>
          <p className="lead" style={{ margin: "14px auto 26px", textAlign: "center" }}>
            Tell us about your material, volume, and floor space — we&apos;ll
            recommend the right line.
          </p>
          <Link href="/book-demo" className="btn btn-primary btn-lg">
            Book a consultation
          </Link>
        </Reveal>
      </section>
    </>
  );
}
