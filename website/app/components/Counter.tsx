"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `to` when scrolled into view. */
export default function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1600,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      setVal(to);
      return;
    }

    let raf = 0;
    let started = false;
    const run = (start: number) => {
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true;
            run(performance.now());
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [to, duration]);

  return (
    <span ref={ref} className="stat-num">
      {prefix}
      {val.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
