import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workshop Floor Planner — Sanjay Wood Tech",
  description:
    "Browser-based 3D workshop layout tool. Place woodworking machines, measure clearances, and export factory floor plans.",
};

/**
 * Floor planner uses a full-viewport chrome; hide site header/footer via CSS
 * on this route only (see globals .fp-page rules + body class injection).
 */
export default function FloorPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fp-layout-root">{children}</div>;
}
