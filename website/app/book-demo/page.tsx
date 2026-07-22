import { Machinery, fetchPublic } from "../../lib/api";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Demo — clawSW",
  description: "Book a live demonstration of our machinery.",
};

export default async function BookDemoPage() {
  const machines = await fetchPublic<Machinery[]>("/machinery");
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Book a Demo</h1>
      <p style={{ color: "#475569" }}>
        Pick the machine you want to see in action and a preferred date — we
        will get back to you to confirm the slot.
      </p>
      {machines === null ? (
        <p style={{ color: "#64748b" }}>
          Booking is temporarily unavailable. Please try again shortly.
        </p>
      ) : machines.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No machinery is currently open for demos.
        </p>
      ) : (
        <BookingForm machines={machines} />
      )}
    </main>
  );
}
