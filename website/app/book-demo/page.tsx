import { Machinery, fetchPublic } from "../../lib/api";
import BookingForm from "./BookingForm";
import PageIntro from "../components/PageIntro";
import { IconClock, IconService, IconSpark } from "../components/icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Demo — Sanjay Wood Tech",
  description: "Book a live demonstration of our woodworking machinery.",
};

const perks = [
  { icon: <IconSpark />, t: "See it cut", d: "A real machine, running your kind of material." },
  { icon: <IconService />, t: "Ask the engineers", d: "Talk tooling, throughput and setup." },
  { icon: <IconClock />, t: "Flexible slots", d: "Pick a date — we confirm the time." },
];

export default async function BookDemoPage() {
  const machines = await fetchPublic<Machinery[]>("/machinery");
  return (
    <>
      <PageIntro
        eyebrow="Book a Demo"
        title="See the right machine"
        highlight="in action."
        description="Pick the machine you want to see and a preferred date — our team will get back to you to confirm the slot."
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        <div className="demo-layout">
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {perks.map((p) => (
              <div
                key={p.t}
                className="card"
                style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: 22 }}
              >
                <div className="chip" style={{ width: 44, height: 44, flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-sora), sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {p.t}
                  </div>
                  <p className="muted" style={{ fontSize: "0.9rem", marginTop: 4 }}>
                    {p.d}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div>
            {machines === null ? (
              <p className="muted">
                Booking is temporarily unavailable. Please try again shortly.
              </p>
            ) : machines.length === 0 ? (
              <p className="muted">No machinery is currently open for demos.</p>
            ) : (
              <BookingForm machines={machines} />
            )}
          </div>
        </div>
      </section>

      <style>{`
        .demo-layout {
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          gap: 26px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .demo-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
