/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — charcoal / industrial
        bg: {
          DEFAULT: "#0a0b0d",
          2: "#0f1114",
        },
        surface: {
          DEFAULT: "#14171c",
          2: "#191d23",
          3: "#20252c",
        },
        // Text
        ink: {
          DEFAULT: "#f3f1ec",
          muted: "#a7aeb8",
          dim: "#6b727c",
        },
        // Wood / timber gold
        wood: {
          DEFAULT: "#e0a45a",
          2: "#c77d2e",
          deep: "#8a521c",
          glow: "rgba(224, 164, 90, 0.4)",
        },
        // Industrial steel
        steel: {
          DEFAULT: "#6a717a",
          dark: "#2a2e33",
          light: "#9aa3ad",
        },
        // Action
        accent: {
          DEFAULT: "#ef2b3d",
          2: "#c81e2c",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          strong: "rgba(255, 255, 255, 0.14)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.5)",
        "wood-glow": "0 0 40px rgba(224, 164, 90, 0.25)",
      },
      maxWidth: {
        site: "1200px",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
