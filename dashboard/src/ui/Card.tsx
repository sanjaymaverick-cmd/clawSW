export default function Card({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`staff-card ${className}`.trim()}>
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: title ? 4 : 0,
          }}
        >
          {title ? <h2 className="staff-card-title" style={{ margin: 0 }}>{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
