"use client";

/**
 * Export PNG (top-down), PDF, and JSON for the floor planner.
 * Capture uses a hidden bridge ref registered by CaptureBridge inside the canvas.
 */

import { useState } from "react";
import { useFloorPlannerStore } from "@/lib/stores/useFloorPlannerStore";
import {
  downloadDataUrl,
  type CaptureOptions,
} from "@/lib/floor-planner/captureTopDown";

export type CaptureApi = {
  capturePng: (opts: CaptureOptions) => string;
  capturePdf: (opts: CaptureOptions) => Promise<Blob>;
};

/** Module-level registry so HTML UI can trigger canvas capture without context issues. */
let captureApi: CaptureApi | null = null;

export function registerCaptureApi(api: CaptureApi | null) {
  captureApi = api;
}

export default function ExportMenu() {
  const exportJSON = useFloorPlannerStore((s) => s.exportJSON);
  const roomWidth = useFloorPlannerStore((s) => s.roomWidth);
  const roomDepth = useFloorPlannerStore((s) => s.roomDepth);
  const machines = useFloorPlannerStore((s) => s.machines);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const baseOpts = (): CaptureOptions => ({
    width: 1920,
    roomWidth,
    roomDepth,
    filename: `workshop-layout-${Date.now()}`,
  });

  const onPng = () => {
    if (!captureApi) {
      setStatus("Canvas not ready — wait a moment and retry");
      return;
    }
    try {
      setBusy(true);
      const opts = baseOpts();
      const dataUrl = captureApi.capturePng(opts);
      downloadDataUrl(dataUrl, `${opts.filename}.png`);
      setStatus("PNG downloaded (top-down view)");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "PNG capture failed");
    } finally {
      setBusy(false);
    }
  };

  const onPdf = async () => {
    if (!captureApi) {
      setStatus("Canvas not ready — wait a moment and retry");
      return;
    }
    try {
      setBusy(true);
      const opts = baseOpts();
      const blob = await captureApi.capturePdf(opts);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${opts.filename}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("PDF downloaded");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setBusy(false);
    }
  };

  const onJson = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workshop-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`JSON exported · ${machines.length} machines`);
  };

  return (
    <div className="fp-export">
      <span className="fp-export-label">Export</span>
      <button
        type="button"
        className="explorer-chip"
        disabled={busy}
        onClick={onPng}
        title="Top-down PNG of the floor plan"
      >
        PNG
      </button>
      <button
        type="button"
        className="explorer-chip"
        disabled={busy}
        onClick={() => void onPdf()}
        title="Single-page PDF of top-down view"
      >
        PDF
      </button>
      <button
        type="button"
        className="explorer-chip"
        onClick={onJson}
        title="Machine positions as JSON"
      >
        JSON
      </button>
      {status && (
        <span className="fp-export-status" role="status">
          {status}
        </span>
      )}
    </div>
  );
}
