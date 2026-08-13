export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 11,
        fontFamily: "var(--font-sora), sans-serif",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        fontSize: 19,
        color: "var(--text)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lg-wood" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0" stopColor="#e0a45a" />
            <stop offset="1" stopColor="#c77d2e" />
          </linearGradient>
        </defs>
        <rect
          x="1.5"
          y="1.5"
          width="37"
          height="37"
          rx="11"
          fill="#14171c"
          stroke="url(#lg-wood)"
          strokeWidth="1.4"
        />
        {/* stylised saw-blade / gear mark */}
        <g stroke="url(#lg-wood)" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="20" cy="20" r="6.4" fill="none" />
          <path d="M20 6.5v3.5M20 30v3.5M6.5 20h3.5M30 20h3.5M10.6 10.6l2.5 2.5M26.9 26.9l2.5 2.5M29.4 10.6l-2.5 2.5M13.1 26.9l-2.5 2.5" />
        </g>
      </svg>
      <span>
        Sanjay<span style={{ color: "var(--wood)" }}>Wood</span>Tech
      </span>
    </span>
  );
}
