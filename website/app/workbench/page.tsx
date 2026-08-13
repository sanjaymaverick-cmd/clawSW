import Link from "next/link";
import PageIntro from "../components/PageIntro";
import PhysicsWorkbenchClient from "../../components/3d/PhysicsWorkbenchClient";

export const metadata = {
  title: "Physics Workbench — Sanjay Wood Tech",
  description:
    "Interactive tools & spares workbench with real-time physics. Drag tools, spawn spares, and feel the mechanical settle.",
};

export default function WorkbenchPage() {
  return (
    <>
      <PageIntro
        eyebrow="Interactive"
        title="Tools & spares"
        highlight="interactive workbench."
        description="Drag service tools and spare kits onto the bench and see them settle naturally. A hands-on way to explore the tooling and spares that ship with your machine."
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(48px, 8vw, 96px)" }}
      >
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href="/products/beam-saw-bs-2700" className="text-ink-muted hover:text-wood">
            ← Machine explorer
          </Link>
          <Link href="/catalog" className="text-ink-muted hover:text-wood">
            Spares catalog
          </Link>
          <Link href="/floor-planner" className="text-wood hover:underline">
            Floor planner →
          </Link>
        </div>

        <PhysicsWorkbenchClient height="min(70vh, 640px)" />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Natural handling",
              d: "Pick up a tool and it follows your pointer precisely, then settles onto the bench when you let go.",
            },
            {
              t: "Full service kit",
              d: "Wrench, driver, caliper, blade, spare box, and clamp — the tooling that supports every machine we install.",
            },
            {
              t: "Genuine spares",
              d: "Every machine is backed by stocked spares and pan-India service support.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-md border border-border bg-surface px-4 py-4"
            >
              <div className="font-display text-sm font-semibold text-wood">
                {c.t}
              </div>
              <p className="mt-2 text-sm text-ink-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
