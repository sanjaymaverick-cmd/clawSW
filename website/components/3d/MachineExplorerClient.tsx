"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Machine } from "@/data/machines";
import type { MachinePartId } from "@/data/machines";

const MachineExplorer = dynamic(() => import("./MachineExplorer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 480,
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--border)",
        background:
          "radial-gradient(50% 50% at 50% 40%, rgba(224,164,90,0.08), transparent 70%), var(--surface)",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
      }}
    >
      Loading 3D explorer…
    </div>
  ),
});

export type MachineExplorerClientProps = {
  machine: Machine;
  height?: number | string;
};

export default function MachineExplorerClient({
  machine,
  height = 480,
}: MachineExplorerClientProps) {
  const router = useRouter();

  const onRequestQuote = (_part: MachinePartId | null, m: Machine) => {
    const q = new URLSearchParams({
      machine: m.name,
      model: m.model ?? "",
    });
    router.push(`/book-demo?${q.toString()}`);
  };

  const onRelatedSpares = (_part: MachinePartId, _m: Machine) => {
    router.push("/catalog");
  };

  return (
    <MachineExplorer
      machine={machine}
      height={height}
      onRequestQuote={onRequestQuote}
      onRelatedSpares={onRelatedSpares}
    />
  );
}
