"use client";

/**
 * AR entry point — iOS USDZ (Quick Look) + Android Scene Viewer (GLB).
 * When no asset URL is provided, opens instructions / placeholder flow.
 */

import { useMemo, useState } from "react";

export type ViewInARButtonProps = {
  /** Absolute or site-relative .glb URL */
  glbUrl?: string | null;
  /** Absolute or site-relative .usdz URL (iOS) */
  usdzUrl?: string | null;
  /** Display title for Scene Viewer */
  title?: string;
  className?: string;
  size?: "sm" | "md";
};

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

export default function ViewInARButton({
  glbUrl,
  usdzUrl,
  title = "Sanjay Wood Tech Machine",
  className = "",
  size = "md",
}: ViewInARButtonProps) {
  const [hint, setHint] = useState<string | null>(null);

  const hasAsset = Boolean(glbUrl || usdzUrl);

  const href = useMemo(() => {
    if (typeof window === "undefined") return "#";
    if (isIOS() && usdzUrl) return usdzUrl;
    if (isAndroid() && glbUrl) {
      const model = absoluteUrl(glbUrl);
      return `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
        model
      )}&mode=ar_preferred&title=${encodeURIComponent(
        title
      )}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
        window.location.href
      )};end;`;
    }
    if (glbUrl) return glbUrl;
    if (usdzUrl) return usdzUrl;
    return "#";
  }, [glbUrl, usdzUrl, title]);

  const onClick = () => {
    if (!isIOS() && !isAndroid() && glbUrl) {
      // Desktop: download / open GLB
      setHint("Open on a phone for AR, or download the 3D model.");
    }
  };

  const pad = size === "sm" ? "8px 12px" : "11px 16px";
  const fontSize = size === "sm" ? "0.8rem" : "0.88rem";

  // No real AR asset yet — don't advertise a feature that isn't there.
  if (!hasAsset) return null;

  return (
    <div className={className} style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      {isIOS() && usdzUrl ? (
        <a
          rel="ar"
          href={usdzUrl}
          className="btn btn-wood"
          style={{ padding: pad, fontSize }}
          onClick={onClick}
        >
          View in AR
        </a>
      ) : (
        <a
          href={href}
          className="btn btn-wood"
          style={{ padding: pad, fontSize }}
          onClick={onClick}
          {...(isAndroid() && glbUrl
            ? {}
            : glbUrl
              ? { download: true }
              : {})}
        >
          View in AR
        </a>
      )}
      {hint && (
        <span
          style={{
            fontSize: "0.72rem",
            color: "var(--text-dim)",
            maxWidth: 260,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
