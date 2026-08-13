"use client";

/**
 * Homepage hero shell — owns the section ref for scroll-linked camera.
 * Keeps page.tsx as a server component while Hero3D gets a real section target.
 */

import { useRef, type ReactNode, type CSSProperties } from "react";
import Hero3DClient from "./Hero3DClient";

const sectionStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  minHeight: "min(92vh, 900px)",
  display: "flex",
  alignItems: "center",
};

type Props = {
  children: ReactNode;
};

export default function HomeHero({ children }: Props) {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} style={sectionStyle}>
      <div className="hero-canvas">
        <Hero3DClient sectionRef={sectionRef} />
      </div>
      {children}
    </section>
  );
}
