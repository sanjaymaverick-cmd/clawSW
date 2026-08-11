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
        eyebrow="Sales enablement"
        title="Tools & spares"
        highlight="physics workbench."
        description="Drop service tools and spare kits onto a wooden bench. Bodies switch to kinematic while you drag for precise placement, then settle with damping — Lusion-level interaction for the spare-parts conversation."
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
              t: "Kinematic drag",
              d: "Held tools become kinematic for precise pointer following, then return to dynamic bodies.",
            },
            {
              t: "Spawn kit",
              d: "Wrench, driver, caliper, blade, spare box, and clamp — ready for the service story.",
            },
            {
              t: "Zustand state",
              d: "All items live in useSceneStore for future AR export and sales notes hooks.",
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
