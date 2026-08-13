import Link from "next/link";
import { Logo } from "./Logo";
import { company, categories } from "../../lib/content";

const explore = [
  { label: "All Machinery", href: "/machinery" },
  { label: "Industries", href: "/industries" },
  { label: "Services", href: "/services" },
  { label: "Spares & Tools", href: "/catalog" },
  { label: "Gallery", href: "/gallery" },
  { label: "Book a Demo", href: "/book-demo" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Projects / Gallery", href: "/gallery" },
  { label: "Staff login", href: "/login" },
];

export default function SiteFooter() {
  const machineCats = categories
    .filter((c) => c.slug !== "new-launches")
    .map((c) => ({
      label: c.name.replace("Solid Woodworking Machinery — Taiwan", "Taiwan Range"),
      href: `/machinery?cat=${c.slug}`,
    }));

  return (
    <footer className="hairline-top" style={{ marginTop: 40 }}>
      <div
        className="container"
        style={{ paddingBlock: "clamp(48px, 7vw, 80px)" }}
      >
        <div
          style={{
            display: "grid",
            gap: 40,
            gridTemplateColumns: "minmax(240px, 1.35fr) repeat(3, 1fr)",
          }}
          className="footer-grid"
        >
          <div style={{ maxWidth: 340 }}>
            <Logo />
            <p className="muted" style={{ marginTop: 18, fontSize: "0.95rem" }}>
              {company.tagline}
            </p>
            <p className="dim" style={{ marginTop: 16, fontSize: "0.85rem", lineHeight: 1.55 }}>
              {company.address}
            </p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {company.emails.map((em) => (
                <a
                  key={em}
                  href={`mailto:${em}`}
                  className="muted"
                  style={{ fontSize: "0.9rem" }}
                >
                  {em}
                </a>
              ))}
              <a
                href={`tel:${company.phones[0]?.replace(/\s/g, "")}`}
                style={{ color: "var(--wood)", fontWeight: 600, fontSize: "0.95rem", marginTop: 4 }}
              >
                {company.phones[0]}
              </a>
            </div>
          </div>

          <FooterCol title="Explore" items={explore} />
          <FooterCol title="Machinery" items={machineCats} />
          <FooterCol title="Company" items={companyLinks} />
        </div>

        <hr className="divider" style={{ margin: "44px 0 22px" }} />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--text-dim)",
            fontSize: "0.82rem",
          }}
        >
          <span>
            © {new Date().getFullYear()} {company.name}. All rights reserved.
          </span>
          <span>Jodhpur · Direct import · Pan-India service</span>
        </div>
      </div>

      <style>{`
        footer .muted:hover { color: var(--wood); }
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 520px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-sora), sans-serif",
          fontWeight: 600,
          fontSize: "0.9rem",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {items.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className="muted"
            style={{ fontSize: "0.92rem", transition: "color 0.2s" }}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
