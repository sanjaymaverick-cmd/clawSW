import type { MetadataRoute } from "next";
import { products, categories, industries } from "../lib/content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sanjaywoodtech.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    "",
    "/machinery",
    "/catalog",
    "/services",
    "/industries",
    "/projects",
    "/gallery",
    "/about",
    "/contact",
    "/book-demo",
    "/privacy",
    "/terms",
    "/refund-policy",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const productRoutes = products.map((p) => ({
    url: `${siteUrl}/machinery/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const categoryRoutes = categories
    .filter((c) => c.slug !== "new-launches")
    .map((c) => ({
      url: `${siteUrl}/machinery?cat=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  const industryRoutes = industries.map((i) => ({
    url: `${siteUrl}/industries/${i.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...industryRoutes];
}
