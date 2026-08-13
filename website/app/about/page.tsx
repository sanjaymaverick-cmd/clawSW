import Link from "next/link";
import PageIntro from "../components/PageIntro";
import Reveal from "../components/Reveal";
import { company } from "../../lib/content";

export const metadata = {
  title: "About Us — Sanjay Wood Tech",
  description: company.story.slice(0, 155),
};

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About us"
        title="Built on expertise."
        highlight="Trusted by industry."
        description={company.story}
      />

      <section className="container" style={{ paddingBottom: 48 }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {company.stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <div className="card" style={{ textAlign: "center", padding: 28 }}>
                <div
                  style={{
                    fontFamily: "var(--font-sora), sans-serif",
                    fontSize: "1.8rem",
                    fontWeight: 700,
                    color: "var(--wood)",
                  }}
                >
                  {s.value}
                </div>
                <div className="dim" style={{ marginTop: 8, fontSize: "0.88rem" }}>
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <div
          style={{
            display: "grid",
            gap: 40,
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
          }}
          className="about-split"
        >
          <Reveal>
            <span className="eyebrow">Our mission</span>
            <h2 className="h2" style={{ marginTop: 14 }}>
              World-class machines, without the middlemen.
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              {company.mission}
            </p>
            <p className="muted" style={{ marginTop: 16 }}>
              Headquartered in {company.hq}, founded {company.founded}. Direct
              imports from China, Taiwan and Europe — installed and supported
              across India.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="card card-glow" style={{ padding: 32 }}>
              <h3 className="h3" style={{ marginBottom: 16 }}>
                Why factories choose us
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {company.why_us.map((w) => (
                  <div key={w.title}>
                    <div style={{ fontWeight: 600, color: "var(--wood)" }}>
                      {w.title}
                    </div>
                    <p className="muted" style={{ marginTop: 6, fontSize: "0.92rem" }}>
                      {w.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {company.team.length > 0 && (
        <section className="container section">
          <Reveal style={{ marginBottom: 36, maxWidth: 560 }}>
            <span className="eyebrow">Leadership</span>
            <h2 className="h2" style={{ marginTop: 14 }}>
              58+ combined years of industrial machinery expertise.
            </h2>
          </Reveal>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {company.team.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="card" style={{ height: "100%" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-sora), sans-serif",
                      fontWeight: 700,
                      fontSize: "1.25rem",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      color: "var(--wood)",
                      marginTop: 6,
                      fontWeight: 500,
                      fontSize: "0.92rem",
                    }}
                  >
                    {t.role}
                  </div>
                  <p className="muted" style={{ marginTop: 14, fontSize: "0.92rem" }}>
                    {t.bio}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="container section" style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}>
        <Reveal className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2 className="h2">Ready to equip your production line?</h2>
          <p className="lead" style={{ margin: "16px auto 28px", textAlign: "center" }}>
            Talk to an engineer about the right machine for your material, volume, and floor space.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/book-demo" className="btn btn-primary btn-lg">
              Book a demo
            </Link>
            <Link href="/contact" className="btn btn-ghost btn-lg">
              Contact us
            </Link>
          </div>
        </Reveal>
      </section>

      <style>{`
        @media (max-width: 800px) {
          .about-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
