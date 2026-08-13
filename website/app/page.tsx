import Link from "next/link";
import Reveal from "./components/Reveal";
import Counter from "./components/Counter";
import HomeHero from "./components/HomeHero";
import {
  IconMachine,
  IconTool,
  IconService,
  IconProjects,
  IconShield,
  IconTruck,
  IconClock,
  IconSpark,
} from "./components/icons";
import {
  company,
  categories,
  products,
  industries,
} from "../lib/content";
import IndustryMatcher from "./components/IndustryMatcher";

const ArrowR = () => (
  <svg
    className="arrow"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const marqueeItems = [
  "Panel Saws",
  "Beam Saws",
  "CNC Nesting",
  "Edge Banders",
  "Wide-Belt Sanders",
  "Four Side Moulders",
  "Veneer Guillotines",
  "Rip Saws",
  "Tenoners",
  "Hot Presses",
];

const newLaunches = products.filter((p) => p.is_new).slice(0, 6);
const featured =
  newLaunches.length >= 4
    ? newLaunches
    : products.filter((p) => p.image).slice(0, 6);

export default function Home() {
  return (
    <>
      {/* ================= HERO ================= */}
      <HomeHero>
        <div
          className="container"
          style={{ position: "relative", zIndex: 2, paddingBlock: "80px" }}
        >
          <div style={{ maxWidth: 640 }}>
            <div className="rise rise-1" style={{ marginBottom: 22 }}>
              <span className="badge">
                <span className="dot" />
                Woodworking Machinery · Jodhpur · Since {company.founded}
              </span>
            </div>

            <h1 className="display rise rise-2" style={{ marginBottom: 22 }}>
              Engineered for precision.{" "}
              <span className="text-gradient">Built for performance.</span>
            </h1>

            <p
              className="lead rise rise-3"
              style={{ marginBottom: 34, maxWidth: 540 }}
            >
              {company.tagline} Direct imports from China, Taiwan and Europe —
              installed and supported across India.
            </p>

            <div
              className="rise rise-3"
              style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
            >
              <Link href="/book-demo" className="btn btn-primary btn-lg">
                Book a Demo
                <ArrowR />
              </Link>
              <Link href="/machinery" className="btn btn-ghost btn-lg">
                Explore {products.length}+ Machines
              </Link>
            </div>

            <div
              className="rise rise-4"
              style={{
                display: "flex",
                gap: 34,
                marginTop: 46,
                flexWrap: "wrap",
              }}
            >
              {company.stats.slice(0, 3).map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontFamily: "var(--font-sora), sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "var(--wood)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div className="dim" style={{ fontSize: "0.82rem" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            height: 140,
            background: "linear-gradient(to bottom, transparent, var(--bg))",
            zIndex: 1,
          }}
        />
      </HomeHero>

      {/* ================= MARQUEE ================= */}
      <div
        className="hairline-top"
        style={{ borderBottom: "1px solid var(--border)", paddingBlock: 26 }}
      >
        <div className="marquee">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((m, i) => (
              <span className="marquee-item" key={i}>
                <IconSpark className="wood-ico" />
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ================= EXPLORE IN 60s PATH STRIP ================= */}
      <section className="section container" style={{ paddingTop: "clamp(40px, 6vw, 72px)", paddingBottom: "clamp(32px, 5vw, 56px)" }}>
        <Reveal style={{ marginBottom: 28, maxWidth: 560 }}>
          <span className="eyebrow">Start here</span>
          <h2 className="h2" style={{ marginTop: 12, fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>
            Explore in <span className="text-gradient">60 seconds.</span>
          </h2>
          <p className="muted" style={{ marginTop: 10, fontSize: "0.95rem" }}>
            Four steps from first look to a booked demo — no form until you&apos;re ready.
          </p>
        </Reveal>
        <div className="path-strip">
          {[
            {
              n: "01",
              title: "Browse machines",
              desc: "Filter by panel, solid wood, or veneer lines.",
              href: "/machinery",
            },
            {
              n: "02",
              title: "Inspect in 3D",
              desc: "Explode assemblies and check clearances.",
              href: "/products/beam-saw-bs-2700",
            },
            {
              n: "03",
              title: "Plan the floor",
              desc: "Drop machines on a grid with snap & export.",
              href: "/floor-planner",
            },
            {
              n: "04",
              title: "Book a demo",
              desc: "Live walkthrough with our engineers.",
              href: "/book-demo",
            },
          ].map((step, i) => (
            <Reveal key={step.href} delay={i * 60}>
              <Link href={step.href} className="path-step">
                <span className="path-step-num">{step.n}</span>
                <span className="path-step-title">{step.title}</span>
                <span className="path-step-desc">{step.desc}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= IMMERSIVE SYSTEMS ================= */}
      <section className="section container">
        <Reveal style={{ marginBottom: 36, maxWidth: 640 }}>
          <span className="eyebrow">Immersive sales tools</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Explore, place, and prove{" "}
            <span className="text-gradient">before you install.</span>
          </h2>
          <p className="muted" style={{ marginTop: 14 }}>
            Three signature experiences for modern B2B machinery sales — 3D
            machine explorer, physics workbench for tools &amp; spares, and a
            full workshop floor planner.
          </p>
        </Reveal>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          {[
            {
              href: "/products/beam-saw-bs-2700",
              title: "3D Machine Explorer",
              d: "Inspect, explode, and operate assemblies with physical spring interaction.",
              cta: "Open explorer",
            },
            {
              href: "/workbench",
              title: "Physics Workbench",
              d: "Drag tools and spares onto a wooden bench and see them settle naturally.",
              cta: "Open workbench",
            },
            {
              href: "/floor-planner",
              title: "Floor Planner",
              d: "Lay out machines with grid snap, clearances, measure, save/load, PNG export.",
              cta: "Plan a floor",
            },
          ].map((card, i) => (
            <Reveal key={card.href} delay={i * 80}>
              <Link
                href={card.href}
                className="card"
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 180,
                }}
              >
                <h3 className="h3" style={{ fontSize: "1.15rem" }}>
                  {card.title}
                </h3>
                <p className="muted" style={{ marginTop: 10, flex: 1, fontSize: "0.92rem" }}>
                  {card.d}
                </p>
                <div
                  style={{
                    marginTop: 18,
                    color: "var(--wood)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  {card.cta} →
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= MACHINE RANGES ================= */}
      <section className="section container">
        <Reveal style={{ marginBottom: 44, maxWidth: 640 }}>
          <span className="eyebrow">Our machine range</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            One source for every machine{" "}
            <span className="text-gradient">your factory needs.</span>
          </h2>
          <p className="muted" style={{ marginTop: 14 }}>
            Complete machinery solutions for woodworking, panel and veneer
            industries — {products.length} models in catalogue.
          </p>
        </Reveal>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {categories
            .filter((c) => c.slug !== "new-launches")
            .map((c, i) => (
              <Reveal key={c.slug} delay={i * 70}>
                <Link
                  href={`/machinery?cat=${c.slug}`}
                  className="card"
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 200,
                  }}
                >
                  <div className="chip">
                    <IconMachine />
                  </div>
                  <h3 className="h3" style={{ marginTop: 18, fontSize: "1.2rem" }}>
                    {c.name}
                  </h3>
                  <p className="muted" style={{ marginTop: 10, fontSize: "0.92rem", flex: 1 }}>
                    {c.description}
                  </p>
                  <div
                    style={{
                      marginTop: 18,
                      color: "var(--wood)",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    {c.count} machines →
                  </div>
                </Link>
              </Reveal>
            ))}
        </div>
      </section>

      {/* ================= FEATURED / NEW ================= */}
      {featured.length > 0 && (
        <section className="section container">
          <Reveal style={{ marginBottom: 36, maxWidth: 560 }}>
            <span className="eyebrow">
              {newLaunches.length ? "New launches" : "Featured machines"}
            </span>
            <h2 className="h2" style={{ marginTop: 14 }}>
              Latest from global manufacturers.
            </h2>
          </Reveal>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            {featured.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 70}>
                <Link
                  href={`/machinery/${p.slug}`}
                  className="card"
                  style={{ padding: 0, overflow: "hidden", height: "100%" }}
                >
                  <div
                    style={{
                      aspectRatio: "16/10",
                      background: "var(--surface-2)",
                    }}
                  >
                    {p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ padding: 18 }}>
                    <div className="dim" style={{ fontSize: "0.75rem" }}>
                      {p.category}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 6,
                        fontSize: "1rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {p.name}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/machinery" className="btn btn-ghost">
              View full catalogue <ArrowR />
            </Link>
          </div>
        </section>
      )}

      {/* ================= BENTO ================= */}
      <section className="section container">
        <Reveal style={{ marginBottom: 44, maxWidth: 620 }}>
          <span className="eyebrow">What we do</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            One partner for the whole{" "}
            <span className="text-gradient">machine lifecycle.</span>
          </h2>
        </Reveal>

        <div className="bento">
          <Reveal className="col-4 row-2" style={{ height: "100%" }}>
            <Link
              href="/machinery"
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                minHeight: 320,
              }}
            >
              <div>
                <div className="chip">
                  <IconMachine />
                </div>
                <h3 className="h3" style={{ marginTop: 22 }}>
                  Industrial Woodworking Machinery
                </h3>
                <p className="muted" style={{ marginTop: 12, maxWidth: 460 }}>
                  Panel processing, solid wood, Taiwan range and veneer lines —
                  sourced, installed, and commissioned by engineers who know
                  them inside out.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--wood)",
                  fontWeight: 600,
                  marginTop: 26,
                }}
              >
                Browse {products.length} machines <ArrowR />
              </div>
            </Link>
          </Reveal>

          <Reveal className="col-2" delay={80}>
            <Link href="/catalog" className="card" style={{ display: "block", height: "100%" }}>
              <div className="chip">
                <IconTool />
              </div>
              <h3 className="h3" style={{ marginTop: 18, fontSize: "1.25rem" }}>
                Genuine Spares &amp; Tools
              </h3>
              <p className="muted" style={{ marginTop: 10, fontSize: "0.92rem" }}>
                Order the exact part, stocked in India and dispatched fast.
              </p>
            </Link>
          </Reveal>

          <Reveal className="col-2" delay={160}>
            <Link href="/services" className="card" style={{ display: "block", height: "100%" }}>
              <div className="chip">
                <IconService />
              </div>
              <h3 className="h3" style={{ marginTop: 18, fontSize: "1.25rem" }}>
                Installation &amp; Training
              </h3>
              <p className="muted" style={{ marginTop: 10, fontSize: "0.92rem" }}>
                Layout, commissioning, operator training, pilot run &amp; handover.
              </p>
            </Link>
          </Reveal>

          <Reveal className="col-2" delay={220}>
            <Link href="/gallery" className="card" style={{ display: "block", height: "100%" }}>
              <div className="chip">
                <IconProjects />
              </div>
              <h3 className="h3" style={{ marginTop: 18, fontSize: "1.25rem" }}>
                Installations &amp; Gallery
              </h3>
              <p className="muted" style={{ marginTop: 10, fontSize: "0.92rem" }}>
                Production units we have equipped across India.
              </p>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ================= INDUSTRY MATCHER (P1) ================= */}
      <section className="section container">
        <Reveal>
          <IndustryMatcher />
        </Reveal>
      </section>

      {/* ================= INDUSTRIES ================= */}
      <section className="section container">
        <Reveal style={{ marginBottom: 36, maxWidth: 600 }}>
          <span className="eyebrow">Industries</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Powering production across every workshop.
          </h2>
        </Reveal>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {industries
            .filter((i) =>
              [
                "furniture-manufacturers",
                "modular-kitchen",
                "door-window",
                "plywood-panel",
                "metal-fabrication",
                "stone-marble",
              ].includes(i.slug)
            )
            .map((ind, i) => (
              <Reveal key={ind.slug} delay={(i % 3) * 50}>
                <Link href={`/industries/${ind.slug}`} className="card" style={{ height: "100%" }}>
                  <h3 style={{ fontWeight: 600, fontSize: "1.05rem" }}>{ind.name}</h3>
                  {ind.description && (
                    <p
                      className="muted"
                      style={{
                        marginTop: 10,
                        fontSize: "0.88rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ind.description}
                    </p>
                  )}
                </Link>
              </Reveal>
            ))}
        </div>
      </section>

      {/* ================= WHY US ================= */}
      <section className="section container">
        <div className="why-grid">
          <Reveal style={{ maxWidth: 460 }}>
            <span className="eyebrow">Why Sanjay Wood Tech</span>
            <h2 className="h2" style={{ marginTop: 14 }}>
              Built on uptime, not just sales.
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              {company.mission}
            </p>
            <Link href="/about" className="btn btn-wood" style={{ marginTop: 28 }}>
              About the company <ArrowR />
            </Link>
          </Reveal>

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[
              {
                icon: <IconShield />,
                t: company.why_us[0]?.title || "Direct import pricing",
                d: company.why_us[0]?.description || "No middlemen — China, Taiwan & Europe.",
              },
              {
                icon: <IconTruck />,
                t: company.why_us[1]?.title || "Expert installation",
                d: company.why_us[1]?.description || "Commissioned on your factory floor.",
              },
              {
                icon: <IconClock />,
                t: company.why_us[2]?.title || "Operator training",
                d: company.why_us[2]?.description || "Hands-on training with every machine.",
              },
              {
                icon: <IconSpark />,
                t: company.why_us[3]?.title || "Pan India service",
                d: company.why_us[3]?.description || "Spares and service support nationwide.",
              },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 90}>
                <div className="card" style={{ padding: 24, height: "100%" }}>
                  <div className="chip" style={{ width: 44, height: 44 }}>
                    {f.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sora), sans-serif",
                      fontWeight: 600,
                      marginTop: 16,
                      fontSize: "1.05rem",
                    }}
                  >
                    {f.t}
                  </div>
                  <p className="muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>
                    {f.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="section">
        <div className="container">
          <Reveal
            className="card card-glow"
            style={{
              padding: "clamp(32px, 5vw, 56px)",
              background:
                "radial-gradient(80% 120% at 0% 0%, rgba(224,164,90,0.12), transparent 55%), linear-gradient(180deg, var(--surface-2), var(--surface))",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 32,
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                textAlign: "center",
              }}
            >
              <div>
                <Counter to={28} suffix="+" />
                <div className="stat-label">Years of experience</div>
              </div>
              <div>
                <Counter to={2000} suffix="+" />
                <div className="stat-label">Factories equipped</div>
              </div>
              <div>
                <Counter to={products.length} suffix="" />
                <div className="stat-label">Machines in catalogue</div>
              </div>
              <div>
                <Counter to={4} suffix="" />
                <div className="stat-label">Cities with tech teams</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      {company.testimonials.length > 0 && (
        <section className="section container">
          <Reveal style={{ marginBottom: 36, maxWidth: 560 }}>
            <span className="eyebrow">What factory owners say</span>
            <h2 className="h2" style={{ marginTop: 14 }}>
              Hear from production teams who trust us.
            </h2>
          </Reveal>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {company.testimonials.slice(0, 3).map((t, i) => (
              <Reveal key={i} delay={i * 70}>
                <blockquote
                  className="card"
                  style={{
                    height: "100%",
                    margin: 0,
                    fontSize: "0.95rem",
                    lineHeight: 1.65,
                    color: "var(--text-muted)",
                  }}
                >
                  “{t}”
                </blockquote>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ================= CTA ================= */}
      <section className="section container">
        <Reveal
          className="card"
          style={{
            textAlign: "center",
            padding: "clamp(44px, 7vw, 88px) 24px",
            overflow: "hidden",
            background:
              "radial-gradient(60% 100% at 50% 0%, rgba(239,43,61,0.14), transparent 60%), radial-gradient(70% 120% at 50% 120%, rgba(224,164,90,0.16), transparent 60%), linear-gradient(180deg, var(--surface-2), var(--surface))",
          }}
        >
          <span className="eyebrow" style={{ justifyContent: "center" }}>
            Ready when you are
          </span>
          <h2
            className="h2"
            style={{ marginTop: 16, maxWidth: 720, marginInline: "auto" }}
          >
            See the right machine in action — book a live demo today.
          </h2>
          <p
            className="lead"
            style={{ margin: "18px auto 34px", textAlign: "center" }}
          >
            Call {company.phones[0]} or email {company.emails[0]} — our team
            will confirm your slot.
          </p>
          <div
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/book-demo" className="btn btn-primary btn-lg">
              Book a Demo <ArrowR />
            </Link>
            <Link href="/contact" className="btn btn-ghost btn-lg">
              Contact Us
            </Link>
          </div>
        </Reveal>
      </section>

      <style>{`
        .hero-canvas {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 42%;
          z-index: 0;
        }
        .wood-ico { color: var(--wood-2); width: 18px; height: 18px; }
        .why-grid {
          display: grid;
          gap: 44px;
          grid-template-columns: 0.9fr 1.1fr;
          align-items: center;
        }
        @media (max-width: 900px) {
          .why-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 820px) {
          .hero-canvas { left: 0; opacity: 0.32; }
        }
      `}</style>
    </>
  );
}
