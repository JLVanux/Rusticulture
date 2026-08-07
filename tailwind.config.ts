import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        soil: {
          900: "#0b0f0d",
          850: "#0f1512",
          800: "#141c18",
          700: "#1b2620",
          600: "#26332c",
          500: "#35453b",
        },
        moss: {
          400: "#7d9187",
          200: "#c3d2c8",
          100: "#e2ebe4",
        },
        lamp: {
          DEFAULT: "#d94f9c",
          dim: "#a83a78",
          glow: "#ff7bc0",
        },
        ripe: "#f0a830",
        gene: {
          g: "#5fd39a",
          y: "#f2cf5b",
          h: "#6fbfe0",
          w: "#e8735f",
          x: "#8a9299",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        lamp: "0 0 0 1px rgba(217,79,156,.35), 0 0 24px -6px rgba(217,79,156,.45)",
      },
    },
  },
  plugins: [],
};
export default config;
