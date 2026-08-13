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
            <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
              {company.social?.instagram && (
                <a
                  href={company.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Sanjay Wood Tech on Instagram"
                  className="social-link"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              )}
              {company.social?.facebook && (
                <a
                  href={company.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Sanjay Wood Tech on Facebook"
                  className="social-link"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 9h3l.4-3H14V4.5c0-.9.3-1.5 1.6-1.5H17V.2C16.6.1 15.6 0 14.5 0 12 0 10.3 1.5 10.3 4.3V6H7.5v3h2.8v9H14V9z" />
                  </svg>
                </a>
              )}
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
            gap: "8px 18px",
            marginBottom: 16,
            fontSize: "0.82rem",
          }}
        >
          {[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Use", href: "/terms" },
            { label: "Returns & Refunds", href: "/refund-policy" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="muted">
              {l.label}
            </Link>
          ))}
        </div>

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
            © {new Date().getFullYear()} {company.legalName ?? company.name}. All
            rights reserved.
          </span>
          <span>Jodhpur · Direct import · Pan-India service</span>
        </div>

        {(company.cin || company.gstin) && (
          <div
            style={{
              marginTop: 10,
              color: "var(--text-dim)",
              fontSize: "0.76rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 16px",
            }}
          >
            {company.cin && <span>CIN: {company.cin}</span>}
            {company.gstin && <span>GSTIN: {company.gstin}</span>}
          </div>
        )}
      </div>

      <style>{`
        footer .muted:hover { color: var(--wood); }
        .social-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          color: var(--text-muted);
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .social-link:hover {
          color: var(--wood);
          border-color: var(--wood);
          background: var(--surface-2);
        }
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
