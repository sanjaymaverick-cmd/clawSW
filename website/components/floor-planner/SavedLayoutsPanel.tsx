"use client";

import { useRef, useState } from "react";
import { useFloorPlannerStore } from "@/lib/stores/useFloorPlannerStore";
import { salesLayouts, salesNotes } from "@/data/salesLayouts";

export default function SavedLayoutsPanel() {
  const savedLayouts = useFloorPlannerStore((s) => s.savedLayouts);
  const activeLayoutId = useFloorPlannerStore((s) => s.activeLayoutId);
  const saveLayout = useFloorPlannerStore((s) => s.saveLayout);
  const loadLayout = useFloorPlannerStore((s) => s.loadLayout);
  const deleteLayout = useFloorPlannerStore((s) => s.deleteLayout);
  const renameLayout = useFloorPlannerStore((s) => s.renameLayout);
  const exportJSON = useFloorPlannerStore((s) => s.exportJSON);
  const importJSON = useFloorPlannerStore((s) => s.importJSON);

  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onSave = () => {
    const id = saveLayout(name || `Layout ${savedLayouts.length + 1}`);
    setName("");
    setMessage(`Saved layout (${id.slice(-6)})`);
  };

  const onExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workshop-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Exported JSON");
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = importJSON(text);
      setMessage(result.ok ? "Import successful" : result.error);
    } catch {
      setMessage("Could not read file");
    }
  };

  return (
    <aside className="fp-panel fp-saved">
      <header className="fp-panel-header">
        <h2>Saved layouts</h2>
        <p className="dim">Save, load, export, or import workshop plans.</p>
      </header>

      <div className="fp-saved-form">
        <input
          type="text"
          placeholder="Layout name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
        />
        <button type="button" className="btn btn-wood" onClick={onSave}>
          Save current
        </button>
      </div>

      <div className="fp-saved-io">
        <button type="button" className="explorer-chip" onClick={onExport}>
          Export JSON
        </button>
        <button
          type="button"
          className="explorer-chip"
          onClick={() => fileRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="fp-sales-demos">
        <div className="fp-panel-header" style={{ padding: 0, marginBottom: 8 }}>
          <h2 style={{ fontSize: "0.9rem" }}>Sales demo layouts</h2>
          <p className="dim" style={{ fontSize: "0.75rem" }}>
            Pre-built floors for live demos
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {salesLayouts.map((layout) => (
            <button
              key={layout.name}
              type="button"
              className="explorer-chip"
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => {
                const result = importJSON(JSON.stringify(layout));
                setMessage(
                  result.ok
                    ? `Loaded demo “${layout.name}”`
                    : result.error
                );
              }}
            >
              {layout.name}
            </button>
          ))}
        </div>
        <ul
          className="dim"
          style={{
            margin: "10px 0 0",
            paddingLeft: 16,
            fontSize: "0.72rem",
            lineHeight: 1.45,
          }}
        >
          {salesNotes.map((n) => (
            <li key={n.id}>
              <strong style={{ color: "var(--wood)" }}>{n.title}:</strong>{" "}
              {n.body}
            </li>
          ))}
        </ul>
      </div>

      {message && (
        <p className="fp-saved-msg" role="status">
          {message}
        </p>
      )}

      <ul className="fp-saved-list">
        {savedLayouts.length === 0 && (
          <li className="dim" style={{ fontSize: "0.85rem", padding: "8px 0" }}>
            No saved layouts yet.
          </li>
        )}
        {savedLayouts.map((layout) => (
          <li
            key={layout.id}
            className={`fp-saved-item${
              activeLayoutId === layout.id ? " is-active" : ""
            }`}
          >
            <div className="fp-saved-item-main">
              <input
                className="fp-saved-name"
                value={layout.name}
                onChange={(e) => renameLayout(layout.id, e.target.value)}
                aria-label="Layout name"
              />
              <span className="dim" style={{ fontSize: "0.75rem" }}>
                {layout.machines.length} machines ·{" "}
                {new Date(layout.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="fp-saved-item-actions">
              <button
                type="button"
                className="explorer-chip"
                onClick={() => {
                  loadLayout(layout.id);
                  setMessage(`Loaded “${layout.name}”`);
                }}
              >
                Load
              </button>
              <button
                type="button"
                className="explorer-chip"
                style={{ color: "var(--red)" }}
                onClick={() => {
                  if (confirm(`Delete “${layout.name}”?`)) {
                    deleteLayout(layout.id);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
