import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Optional emoji / glyph shown above the title */
  icon?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

/**
 * Premium empty state — illustrated copy + single next action.
 * Used when catalog/search/API returns no rows.
 */
export default function EmptyState({
  title,
  description,
  icon = "◇",
  actionLabel,
  actionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()} role="status">
      <div className="empty-state-icon" aria-hidden>
        {icon}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-wood" style={{ marginTop: 8 }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
