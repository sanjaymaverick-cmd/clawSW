import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMachine,
  getMachineByProductSlug,
  machines,
} from "../../../data/machines";
import MachineExplorerClient from "../../../components/3d/MachineExplorerClient";
import PhysicsWorkbenchClient from "../../../components/3d/PhysicsWorkbenchClient";
import PageIntro from "../../components/PageIntro";

type Props = { params: Promise<{ productId: string }> };

export function generateStaticParams() {
  return machines.map((m) => ({ productId: m.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { productId } = await params;
  const m = getMachine(productId) ?? getMachineByProductSlug(productId);
  if (!m) return { title: "Machine — Sanjay Wood Tech" };
  return {
    title: `${m.name} — 3D Explorer — Sanjay Wood Tech`,
    description: m.description || undefined,
  };
}

export default async function ProductExplorerPage({ params }: Props) {
  const { productId } = await params;
  const machine =
    getMachine(productId) ?? getMachineByProductSlug(productId);
  if (!machine) notFound();

  return (
    <>
      <PageIntro
        eyebrow="3D Machine Explorer"
        title={machine.name}
        description={
          machine.description ||
          "Inspect assemblies, explode parts, and explore the machine before you buy."
        }
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(48px, 8vw, 96px)" }}
      >
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href="/machinery" className="text-ink-muted hover:text-wood">
            ← All machinery
          </Link>
          <Link
            href={`/machinery/${machine.productSlug ?? machine.slug}`}
            className="text-ink-muted hover:text-wood"
          >
            Specs &amp; enquiry
          </Link>
          <Link href="/floor-planner" className="text-wood hover:underline">
            Open floor planner →
          </Link>
        </div>

        <MachineExplorerClient machine={machine} height={560} />

        <div className="mt-10">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-wood">
                Tools &amp; spares
              </div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Physics workbench
              </h2>
            </div>
            <Link href="/workbench" className="text-sm text-wood hover:underline">
              Open full workbench →
            </Link>
          </div>
          <PhysicsWorkbenchClient height={420} />
        </div>

        {machine.features.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {machine.features.map((f) => (
              <div
                key={f}
                className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-ink-muted"
              >
                {f}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
