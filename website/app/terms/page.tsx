import { LegalDoc, LegalContact } from "../components/LegalDoc";
import { company } from "../../lib/content";

export const metadata = {
  title: "Terms of Use — Sanjay Wood Tech",
  description:
    "The terms that govern your use of the Sanjay Wood Tech website, enquiries, and online spare-parts orders.",
};

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of"
      highlight="Use."
      intro="The terms that apply when you use this website, submit an enquiry, or place an order for spares."
      updated="13 August 2026"
    >
      <p>
        By using this website you agree to these terms. They cover the site,
        enquiries and demo requests, and online orders for spare parts and tools.
      </p>

      <h2>Product information</h2>
      <p>
        Machine specifications, images, and descriptions are provided for general
        guidance. Models, features, and dimensions may change without notice as
        products are updated or sourced from different manufacturers. Anything
        shown here is <strong>not a binding offer</strong>; the exact scope,
        specification, and price of any supply are confirmed in our written
        quotation and invoice.
      </p>

      <h2>Enquiries and quotations</h2>
      <p>
        Submitting an enquiry or demo request does not create a contract. We will
        respond with a quotation, and any order proceeds only once both sides
        confirm scope, price, delivery, and payment terms in writing.
      </p>

      <h2>Online spare-parts orders</h2>
      <p>
        An order placed through the catalogue is a request to purchase. We confirm
        availability, price, and dispatch by phone or email before the order is
        accepted and dispatched. Where an item is not available, we will tell you
        and offer an alternative or timeline.
      </p>

      <h2>Installation and service</h2>
      <p>
        Installation, commissioning, operator training, warranty, and after-sales
        service are provided on the terms set out in the relevant quotation or
        service agreement for each machine.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The content of this site — text, images, logos, and 3D models — belongs to
        {" "}
        {company.name} or its suppliers and may not be copied or reused without
        our permission. Some 3D previews use representative geometry and are not
        exact scans of a specific machine.
      </p>

      <h2>Limitation</h2>
      <p>
        We take care to keep information accurate but do not warrant that the site
        is error-free or always available. To the extent permitted by law, we are
        not liable for indirect or consequential loss arising from use of the
        site itself; our obligations for goods and services we supply are governed
        by the applicable quotation, invoice, and Indian law.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India, and the courts at Jodhpur,
        Rajasthan have jurisdiction over any dispute relating to this website.
      </p>

      <LegalContact />
    </LegalDoc>
  );
}
