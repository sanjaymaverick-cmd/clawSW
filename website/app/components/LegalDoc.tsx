import type { ReactNode } from "react";
import PageIntro from "./PageIntro";
import { company } from "../../lib/content";

/** Shared registered-entity contact block for the legal pages. */
export function LegalContact() {
  return (
    <>
      <h2>Contact</h2>
      <p>
        {company.legalName ?? company.name}
        <br />
        {company.address}
        <br />
        <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a>
        {company.phones[0] ? ` · ${company.phones[0]}` : ""}
        {company.cin ? (
          <>
            <br />
            CIN: {company.cin}
          </>
        ) : null}
        {company.gstin ? (
          <>
            <br />
            GSTIN: {company.gstin}
          </>
        ) : null}
      </p>
    </>
  );
}

export function LegalDoc({
  eyebrow,
  title,
  highlight,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={title} highlight={highlight} description={intro} />
      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)", maxWidth: 820 }}
      >
        <p className="dim" style={{ fontSize: "0.85rem", marginBottom: 28 }}>
          Last updated: {updated}
        </p>
        <div className="legal-body">{children}</div>
        <style>{`
          .legal-body h2 {
            font-family: var(--font-sora), sans-serif;
            font-size: 1.15rem;
            font-weight: 600;
            margin: 34px 0 12px;
            color: var(--text);
          }
          .legal-body p, .legal-body li {
            color: var(--text-muted);
            font-size: 0.96rem;
            line-height: 1.7;
          }
          .legal-body p { margin: 0 0 14px; }
          .legal-body ul { margin: 0 0 14px; padding-left: 20px; }
          .legal-body li { margin-bottom: 8px; }
          .legal-body a { color: var(--wood); }
          .legal-body strong { color: var(--text); font-weight: 600; }
        `}</style>
      </section>
    </>
  );
}
