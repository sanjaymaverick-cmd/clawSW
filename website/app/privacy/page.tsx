import { LegalDoc } from "../components/LegalDoc";
import { company } from "../../lib/content";

export const metadata = {
  title: "Privacy Policy — Sanjay Wood Tech",
  description:
    "How Sanjay Wood Tech collects, uses, and protects the information you share through this website.",
};

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy"
      highlight="Policy."
      intro="How we handle the information you share when you enquire, book a demo, or order spares through this site."
      updated="13 August 2026"
    >
      <p>
        This policy explains what information {company.name} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects through this website and how we use it. It applies to
        this site only, not to any third-party site we link to.
      </p>

      <h2>Information we collect</h2>
      <p>We only collect what you choose to give us through the site&rsquo;s forms:</p>
      <ul>
        <li>
          <strong>Enquiry / demo bookings:</strong> your name, company, phone
          number, email, and any details you type about your requirement.
        </li>
        <li>
          <strong>Spare-parts orders:</strong> the items and quantities you
          request, plus the contact and delivery details needed to fulfil the
          order.
        </li>
        <li>
          <strong>Basic technical data:</strong> standard server logs (such as
          IP address and browser type) that most websites record for security
          and reliability.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To respond to your enquiry and prepare a quotation.</li>
        <li>To arrange demos, installation, spares dispatch, and after-sales service.</li>
        <li>To keep records of orders and service we have carried out for you.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell or rent your personal information to
        anyone, and we do not use it for unrelated marketing without your consent.
      </p>

      <h2>Where your data lives</h2>
      <p>
        Our business systems run on hardware we operate ourselves. We share your
        details with third parties only where it is needed to serve you — for
        example a courier for delivery — and only the information required for
        that purpose. Tax invoices are handled through our accounting system as
        required by law.
      </p>

      <h2>Retention</h2>
      <p>
        We keep enquiry, order, and service records for as long as needed to
        support you and to meet our legal and accounting obligations, after which
        they are removed or anonymised.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us what information we hold about you, request a correction,
        or ask us to delete it, subject to records we must retain by law. To make
        a request, email{" "}
        <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a>.
      </p>

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
    </LegalDoc>
  );
}
