import PageIntro from "../components/PageIntro";
import Reveal from "../components/Reveal";
import { galleryImages, tradeFairImages } from "../../lib/content";

export const metadata = {
  title: "Gallery — Sanjay Wood Tech",
  description:
    "Installations, factory floors, and trade fair moments from Sanjay Wood Tech projects across India.",
};

export default function GalleryPage() {
  const images = [...galleryImages, ...tradeFairImages];
  // de-dupe by src
  const seen = new Set<string>();
  const unique = images.filter((im) => {
    if (!im?.src || seen.has(im.src)) return false;
    seen.add(im.src);
    return true;
  });

  return (
    <>
      <PageIntro
        eyebrow="Gallery"
        title="Production floors we've"
        highlight="equipped."
        description="A look at machines, installations, and trade shows — the work behind 2000+ factories."
      />

      <section
        className="container"
        style={{ paddingBottom: "clamp(56px, 9vw, 110px)" }}
      >
        {unique.length === 0 ? (
          <p className="muted">Gallery images will appear here shortly.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {unique.map((im, i) => (
              <Reveal key={im.src} delay={(i % 6) * 40}>
                <div
                  className="card"
                  style={{ padding: 0, overflow: "hidden", aspectRatio: "4/3" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.src}
                    alt={im.alt || "Sanjay Wood Tech project"}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
