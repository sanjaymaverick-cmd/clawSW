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

export const metadata: Metadata = {
  title: {
    default: "Sanjay Wood Tech — Woodworking Machinery, Spares & Service",
    template: "%s",
  },
  description:
    "Precision-engineered woodworking machinery for Indian factories. Panel processing, solid wood, Taiwan range & veneer lines — direct import, expert installation, pan-India service. Jodhpur since 2001.",
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
