import FloorPlannerApp from "../../components/floor-planner/FloorPlannerApp";

export const metadata = {
  title: "Workshop Floor Planner — Sanjay Wood Tech",
  description:
    "Plan machine layouts for your factory floor — grid snap, clearances, save/load, PNG and JSON export.",
};

/**
 * Phase 4 — full browser-based workshop layout tool.
 */
export default function FloorPlannerPage() {
  return <FloorPlannerApp />;
}
