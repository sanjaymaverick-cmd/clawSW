import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "clawSW — Machinery, Spares & Service",
  description:
    "Industrial machinery sales, genuine spares and tools, and on-site service.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
