type Variant = "default" | "primary" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  default: "",
  primary: "staff-btn-primary",
  ghost: "staff-btn-ghost",
};

export default function Button({
  children,
  variant = "default",
  className = "",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
}) {
  return (
    <button
      type={type}
      className={`staff-btn ${VARIANT_CLASS[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
