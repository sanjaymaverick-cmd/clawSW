import PageIntro from "../components/PageIntro";
import Reveal from "../components/Reveal";
import { company } from "../../lib/content";
import Link from "next/link";

export const metadata = {
  title: "Contact Us — Sanjay Wood Tech",
  description:
    "Visit our Jodhpur facility or reach Sanjay Wood Tech by phone and email for machinery enquiries, spares, and service.",
};

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="We're here to help."
        highlight="Talk to the team."
        description="Fill out a demo request or reach us directly — enquiries, spares, and service support."
      />

      <section
        className="container"
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          paddingBottom: 48,
        }}
      >
        <Reveal>
          <div className="card" style={{ height: "100%" }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Visit us
            </div>
            <h2 className="h3" style={{ fontSize: "1.15rem", marginBottom: 12 }}>
              Jodhpur HQ
            </h2>
            <p className="muted" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
              {company.address}
            </p>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="card" style={{ height: "100%" }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Call
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {company.phones.map((ph) => (
                <a
                  key={ph}
                  href={`tel:${ph.replace(/\s/g, "")}`}
                  style={{
                    fontFamily: "var(--font-sora), sans-serif",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    color: "var(--wood)",
                  }}
                >
                  {ph}
                </a>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="card" style={{ height: "100%" }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Email
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {company.emails.map((em) => (
                <a
                  key={em}
                  href={`mailto:${em}`}
                  style={{
                    fontWeight: 600,
                    color: "var(--text)",
                    fontSize: "1rem",
                  }}
                >
                  {em}
                </a>
              ))}
            </div>
            <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
              {company.social.instagram && (
                <a
                  href={company.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ padding: "10px 16px" }}
                >
                  Instagram
                </a>
              )}
              {company.social.facebook && (
                <a
                  href={company.social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ padding: "10px 16px" }}
                >
                  Facebook
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        <Reveal className="card card-glow" style={{ padding: "clamp(32px, 5vw, 48px)" }}>
          <h2 className="h2" style={{ marginBottom: 12 }}>
            Prefer a structured enquiry?
          </h2>
          <p className="muted" style={{ maxWidth: 520, marginBottom: 24 }}>
            Book a demo or request a quotation — our engineers will confirm the
            right machine for your production goals.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/book-demo" className="btn btn-primary btn-lg">
              Book a demo
            </Link>
            <Link href="/machinery" className="btn btn-ghost btn-lg">
              Browse machinery
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
