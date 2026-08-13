import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import WorkshopDock from "./components/WorkshopDock";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sanjaywoodtech.com";

const description =
  "Precision-engineered woodworking machinery for Indian factories. Panel processing, solid wood, Taiwan range & veneer lines — direct import, expert installation, pan-India service. Jodhpur since 2001.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sanjay Wood Tech — Woodworking Machinery, Spares & Service",
    template: "%s",
  },
  description,
  applicationName: "Sanjay Wood Tech",
  keywords: [
    "woodworking machinery",
    "panel processing",
    "CNC nesting",
    "edge banding",
    "beam saw",
    "solid wood machinery",
    "Jodhpur",
    "Sanjay Wood Tech",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Sanjay Wood Tech",
    title: "Sanjay Wood Tech — Woodworking Machinery, Spares & Service",
    description,
    url: siteUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sanjay Wood Tech — Woodworking Machinery, Spares & Service",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="bg-bg text-ink antialiased">
        <SiteHeader />
        <main style={{ flex: 1 }}>{children}</main>
        <SiteFooter />
        <WorkshopDock />
      </body>
    </html>
  );
}
