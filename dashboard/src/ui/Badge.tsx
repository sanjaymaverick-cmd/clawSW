type Tone = "neutral" | "ok" | "warn" | "info" | "danger" | "wood";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "staff-badge-neutral",
  ok: "staff-badge-ok",
  warn: "staff-badge-warn",
  info: "staff-badge-info",
  danger: "staff-badge-danger",
  wood: "staff-badge-wood",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`staff-badge ${TONE_CLASS[tone]} ${className}`.trim()}>
      {children}
    </span>
  );
}
