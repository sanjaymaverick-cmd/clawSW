"use client";

import dynamic from "next/dynamic";

const PhysicsWorkbench = dynamic(() => import("./PhysicsWorkbench"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 400,
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
      }}
    >
      Loading workbench…
    </div>
  ),
});

export default function PhysicsWorkbenchClient({
  height = 400,
}: {
  height?: number | string;
}) {
  return <PhysicsWorkbench height={height} />;
}
