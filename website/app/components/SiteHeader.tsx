"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

// Primary bar: reads like a machinery company, not a dev demo.
const links = [
  { href: "/machinery", label: "Machinery" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Buyer destinations + the immersive tools, tucked into the mobile menu
// (the 3D surfaces also live on each machine page and the bottom dock).
const exploreLinks = [
  { href: "/catalog", label: "Spares & Tools" },
  { href: "/industries", label: "Industries" },
  { href: "/gallery", label: "Gallery" },
];
const workshopLinks = [
  { href: "/floor-planner", label: "Floor Planner" },
  { href: "/workbench", label: "Workbench" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={scrolled ? "site-header is-scrolled" : "site-header"}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition:
          "background var(--motion-ui) var(--ease-out), border-color var(--motion-ui) var(--ease-out), box-shadow var(--motion-ui) var(--ease-out)",
        background: scrolled ? "rgba(10,11,13,0.78)" : "transparent",
        backdropFilter: scrolled ? "blur(18px) saturate(160%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(18px) saturate(160%)" : "none",
        borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
        boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.25)" : "none",
      }}
    >
      <nav
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          height: 74,
        }}
      >
        <Link href="/" aria-label="Sanjay Wood Tech home">
          <Logo />
        </Link>

        <div style={{ flex: 1 }} />

        <div className="nav-desktop" style={{ alignItems: "center", gap: 20 }}>
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontSize: "0.9rem",
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--wood)" : "var(--text-muted)",
                  transition: "color var(--motion-micro) ease-out",
                  position: "relative",
                }}
                className={active ? "nav-link is-active" : "nav-link"}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/book-demo"
            className="btn btn-wood"
            style={{ padding: "11px 20px" }}
          >
            Book a Demo
            <svg
              className="arrow"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "none",
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-2)",
            color: "var(--text)",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div
          className="glass"
          style={{
            padding: "12px 24px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            borderTop: "1px solid var(--border)",
          }}
        >
          {[...links, ...exploreLinks].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "14px 4px",
                fontSize: "1.05rem",
                fontWeight: 500,
                color: isActive(l.href) ? "var(--wood)" : "var(--text)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {l.label}
            </Link>
          ))}
          <div
            style={{
              padding: "16px 4px 6px",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
            }}
          >
            Workshop tools
          </div>
          {workshopLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "12px 4px",
                fontSize: "1rem",
                fontWeight: 500,
                color: isActive(l.href) ? "var(--wood)" : "var(--text-muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/book-demo" className="btn btn-wood" style={{ marginTop: 14 }}>
            Book a Demo
          </Link>
        </div>
      )}

      <style>{`
        .nav-desktop { display: flex; }
        .nav-link:hover { color: var(--text) !important; }
        .nav-link.is-active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -6px;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, var(--wood), transparent);
        }
        @media (max-width: 980px) {
          .nav-desktop { display: none !important; }
          .nav-toggle { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
