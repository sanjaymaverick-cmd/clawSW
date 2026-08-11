/**
 * Static site content generated from scraper/output_full
 * (run: python scraper/build_site_data.py).
 *
 * Spam / pagination / 404 pages are already filtered out.
 */

import productsJson from "../data/products.json";
import categoriesJson from "../data/categories.json";
import companyJson from "../data/company.json";
import industriesJson from "../data/industries.json";
import galleryJson from "../data/gallery.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductImage = { src: string; alt: string };

export type Product = {
  slug: string;
  name: string;
  model: string | null;
  description: string;
  summary: string;
  body: string[];
  features: string[];
  images: ProductImage[];
  image: string | null;
  source_url: string;
  category_slugs: string[];
  category_paths?: string[];
  primary_category: string | null;
  category: string;
  is_new?: boolean;
};

export type Subcategory = {
  slug: string;
  name: string;
  path: string;
  count: number;
};

export type Category = {
  slug: string;
  name: string;
  path_prefix: string;
  description: string;
  count: number;
  subcategories: Subcategory[];
};

export type Company = {
  name: string;
  tagline: string;
  founded: string;
  hq: string;
  address: string;
  phones: string[];
  emails: string[];
  social: { instagram?: string; facebook?: string };
  stats: { value: string; label: string }[];
  mission: string;
  story: string;
  team: { name: string; role: string; bio: string }[];
  services: { title: string; description: string }[];
  why_us: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  testimonials: string[];
};

export type Industry = {
  slug: string;
  name: string;
  description: string;
  sections: {
    heading: string | null;
    paragraphs: string[];
    items: string[];
  }[];
  images: ProductImage[];
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export const products = productsJson as Product[];
export const categories = categoriesJson as Category[];
export const company = companyJson as Company;
export const industries = industriesJson as Industry[];
export const galleryImages = (galleryJson as { gallery: ProductImage[] }).gallery ?? [];
export const tradeFairImages =
  (galleryJson as { trade_fair: ProductImage[] }).trade_fair ?? [];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string | null | undefined): Product[] {
  if (!categorySlug || categorySlug === "all") return products;
  return products.filter((p) => p.category_slugs?.includes(categorySlug));
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter(
      (p) =>
        p.slug !== product.slug &&
        (p.primary_category === product.primary_category ||
          p.category === product.category)
    )
    .slice(0, limit);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.model ?? "").toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.features.some((f) => f.toLowerCase().includes(q))
  );
}
