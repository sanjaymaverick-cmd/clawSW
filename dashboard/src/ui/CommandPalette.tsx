import { useEffect, useMemo, useState } from "react";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

export default function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.hint ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        filtered[active].run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  return (
    <div
      className="cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
    >
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cmdk-input"
          placeholder="Jump to… inventory, service, orders"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cmdk-list">
          {filtered.length === 0 && (
            <p style={{ padding: 12, color: "var(--dim)", fontSize: "0.875rem", margin: 0 }}>
              No matches.
            </p>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`cmdk-item ${i === active ? "is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                item.run();
                onClose();
              }}
            >
              <span>{item.label}</span>
              {item.hint && (
                <span style={{ fontSize: "0.75rem", color: "var(--dim)" }}>{item.hint}</span>
              )}
            </button>
          ))}
        </div>
        <div className="cmdk-hint">↑↓ navigate · Enter open · Esc close · Ctrl+K anytime</div>
      </div>
    </div>
  );
}
