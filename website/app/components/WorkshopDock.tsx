"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DOCK_ITEMS = [
  { href: "/machinery", label: "Explore machines", short: "Machines" },
  { href: "/floor-planner", label: "3D plan", short: "Plan" },
  { href: "/catalog", label: "Spares", short: "Spares" },
  { href: "/book-demo", label: "Book demo", short: "Demo", primary: true },
] as const;

/** Paths where the engagement rail would fight full-screen or private UIs */
const HIDDEN_PREFIXES = ["/login", "/floor-planner"];

/**
 * Persistent workshop engagement dock — spine for sales loops (P0).
 * Hidden on login and full-screen floor planner.
 */
export default function WorkshopDock() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (hidden) return null;

  return (
    <nav className="workshop-dock" aria-label="Quick workshop actions">
      <div className="workshop-dock-inner">
        {DOCK_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isPrimary = "primary" in item && item.primary;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "workshop-dock-item",
                isPrimary ? "is-primary" : "",
                active ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="workshop-dock-label-full">{item.label}</span>
              <span className="workshop-dock-label-short">{item.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
