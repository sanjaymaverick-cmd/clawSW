"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";

const fallbackStyle = {
  position: "absolute" as const,
  inset: 0,
  background:
    "radial-gradient(48% 48% at 58% 42%, rgba(184,90,26,0.14), transparent 68%), #0a0b0d",
};

const Hero3D = dynamic(() => import("./Hero3D"), {
  ssr: false,
  loading: () => <div aria-hidden style={fallbackStyle} />,
});

/** Isolate R3F / texture failures so the rest of the homepage still renders. */
class HeroErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[Hero3D] falling back after error:", error.message, info);
  }

  render() {
    if (this.state.hasError) {
      return <div aria-hidden style={fallbackStyle} />;
    }
    return this.props.children;
  }
}

export default function Hero3DClient() {
  return (
    <HeroErrorBoundary>
      <Hero3D />
    </HeroErrorBoundary>
  );
}
