const STEPS = ["pending", "confirmed", "synced_to_tally"] as const;

const LABELS: Record<(typeof STEPS)[number], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  synced_to_tally: "Synced",
};

export default function Pipeline({
  status,
}: {
  status: "pending" | "confirmed" | "synced_to_tally" | string;
}) {
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  const current = idx >= 0 ? idx : 0;

  return (
    <div className="pipeline" aria-label={`Order status: ${status}`}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <span key={step} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && (
              <span className={`pipeline-line ${i <= current ? "is-done" : ""}`} />
            )}
            <span
              className={`pipeline-step ${done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
            >
              <span className="pipeline-dot" />
              {LABELS[step]}
            </span>
          </span>
        );
      })}
    </div>
  );
}
