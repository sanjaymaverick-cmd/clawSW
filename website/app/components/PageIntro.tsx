export default function PageIntro({
  eyebrow,
  title,
  highlight,
  description,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
}) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "clamp(56px, 10vw, 110px)",
        paddingBottom: "clamp(28px, 5vw, 48px)",
      }}
    >
      {/* ambient glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 640,
          height: 320,
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(224,164,90,0.16), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div className="container" style={{ position: "relative" }}>
        <span className="eyebrow rise rise-1">{eyebrow}</span>
        <h1
          className="display rise rise-2"
          style={{ marginTop: 16, maxWidth: 780, fontSize: "clamp(2.1rem, 5vw, 3.6rem)" }}
        >
          {title} {highlight && <span className="text-gradient">{highlight}</span>}
        </h1>
        {description && (
          <p className="lead rise rise-3" style={{ marginTop: 20 }}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
