import { LegalDoc } from "../components/LegalDoc";
import { company } from "../../lib/content";

export const metadata = {
  title: "Returns & Refund Policy — Sanjay Wood Tech",
  description:
    "How returns, cancellations, and refunds work for spare-parts orders and machinery supplied by Sanjay Wood Tech.",
};

export default function RefundPolicyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Returns &"
      highlight="Refunds."
      intro="How cancellations, returns, and refunds are handled for spares ordered online and for machinery we supply."
      updated="13 August 2026"
    >
      <p>
        This policy covers orders placed through this website. Because every
        order is confirmed with you before dispatch, the terms below are a
        starting point — the exact terms for your order are those stated on the
        confirmation or invoice we send you.
      </p>

      <h2>Spare parts &amp; tools</h2>
      <ul>
        <li>
          <strong>Before dispatch:</strong> you can cancel or change an order at
          no cost any time before we confirm it for dispatch. Just reply to the
          confirmation or call us.
        </li>
        <li>
          <strong>Wrong or defective item:</strong> if a part arrives damaged, or
          is not what was confirmed, tell us within <strong>7 days</strong> of
          delivery with photos and the order reference. We will arrange a
          replacement or a refund of the item price.
        </li>
        <li>
          <strong>Change of mind:</strong> unused parts in original packaging may
          be returnable subject to inspection; return shipping and any
          manufacturer restocking charge may apply. Special-order or
          machine-specific parts sourced against your order may not be
          returnable.
        </li>
      </ul>

      <h2>Machinery</h2>
      <p>
        Machines are imported or built to order against a written quotation.
        Cancellation, advance, and delivery terms for a machine are set out in
        that quotation and the sales invoice, not by this page. Custom or
        made-to-order machinery is generally non-cancellable once production or
        import has begun.
      </p>

      <h2>How refunds are issued</h2>
      <p>
        Approved refunds are made to the original payment method (or by bank
        transfer where applicable), normally within{" "}
        <strong>7–10 working days</strong> of us receiving and inspecting the
        returned item. Taxes are refunded as required under applicable GST rules.
      </p>

      <h2>How to start a return</h2>
      <p>
        Email <a href={`mailto:${company.emails[0]}`}>{company.emails[0]}</a>
        {company.phones[0] ? ` or call ${company.phones[0]}` : ""} with your order
        reference and the reason for the return, and our team will guide you
        through the next steps.
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
