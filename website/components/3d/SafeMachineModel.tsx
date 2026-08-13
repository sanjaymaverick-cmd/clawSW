"use client";

/**
 * Loads MachineModel when glbUrl is set; falls back to PlaceholderMachine.
 */

import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import type { Machine, MachinePartId } from "@/data/machines";
import PlaceholderMachine from "./PlaceholderMachine";
import MachineModel from "./MachineModel";

type SharedProps = {
  machine: Machine;
  explodeProgress?: number;
  selectedPart?: MachinePartId | null;
  hoveredPart?: MachinePartId | null;
  mode?: "inspect" | "explode" | "operate" | "parts-focus" | "workbench";
  reducedMotion?: boolean;
  showLabels?: boolean;
  onPartClick?: (partId: MachinePartId) => void;
  onPartPointerOver?: (partId: MachinePartId) => void;
  onPartPointerOut?: () => void;
};

class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[SafeMachineModel] GLB failed → placeholder", error.message, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function SafeMachineModel(props: SharedProps) {
  const fallback = <PlaceholderMachine {...props} />;

  if (!props.machine.glbUrl) {
    return fallback;
  }

  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <MachineModel
          machine={props.machine}
          url={props.machine.glbUrl}
          explodeProgress={props.explodeProgress}
          selectedPart={props.selectedPart}
          hoveredPart={props.hoveredPart}
          mode={props.mode}
          reducedMotion={props.reducedMotion}
          showLabels={props.showLabels}
          onPartClick={props.onPartClick}
          onPartPointerOver={props.onPartPointerOver}
          onPartPointerOut={props.onPartPointerOut}
        />
      </Suspense>
    </ModelErrorBoundary>
  );
}
