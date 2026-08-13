import type { Metadata } from "next";
import PageIntro from "../components/PageIntro";
import StaffLoginForm from "./StaffLoginForm";

export const metadata: Metadata = {
  title: "Staff sign-in — Sanjay Wood Tech",
  description: "Internal staff access to Sanjay Wood Tech operations tools.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <PageIntro
        eyebrow="Internal"
        title="Sanjay Wood Tech"
        highlight="staff access."
        description="Sign in to manage inventory, service jobs, website orders, and Tally sync. Customers: use the main site menu — this page is for team members only."
      />

      <section
        className="container"
        style={{
          paddingBottom: "clamp(56px, 9vw, 110px)",
          display: "flex",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "0 10% auto",
            height: 220,
            background:
              "radial-gradient(50% 80% at 50% 0%, rgba(224,164,90,0.14), transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
          <StaffLoginForm />
        </div>
      </section>
    </>
  );
}
