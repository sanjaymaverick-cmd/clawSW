type P = { className?: string };
const base = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconMachine = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V10l7-4 7 4v11" />
    <circle cx="12" cy="13" r="2.4" />
    <path d="M12 8.4v-2M9 15.5l-1.6 1M15 15.5l1.6 1" />
  </svg>
);

export const IconTool = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.5 5.5a3.5 3.5 0 0 0-4.6 4.3l-6 6a1.8 1.8 0 0 0 2.5 2.5l6-6a3.5 3.5 0 0 0 4.3-4.6l-2.2 2.2-1.9-.4-.4-1.9 2.2-2.1Z" />
  </svg>
);

export const IconService = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    <circle cx="12" cy="12" r="3.4" />
  </svg>
);

export const IconProjects = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M3 9h18M8 18v3M16 18v3M6 21h12" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IconTruck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
  </svg>
);
