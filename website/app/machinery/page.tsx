import { Suspense } from "react";
import PageIntro from "../components/PageIntro";
import { categories, products } from "../../lib/content";
import MachineryBrowser from "./MachineryBrowser";

export const metadata = {
  title: "Machinery — Sanjay Wood Tech",
  description:
    "Industrial woodworking machinery: panel processing, solid wood, Taiwan range, and veneer line machines. Direct import, expert installation.",
};

export default function MachineryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Machinery"
        title="Industrial woodworking machinery,"
        highlight="sourced & commissioned."
        description={`Browse ${products.length} machines across panel processing, solid wood, Taiwan-built lines, and veneer equipment — imported directly and installed by our technical team.`}
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        <Suspense fallback={<p className="muted">Loading catalogue…</p>}>
          <MachineryBrowser products={products} categories={categories} />
        </Suspense>
      </section>
    </>
  );
}
