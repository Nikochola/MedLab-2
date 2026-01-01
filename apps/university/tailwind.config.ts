import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-figtree)", "system-ui", "sans-serif"],
        mono: ["var(--font-figtree)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        background: "#ffffff",
        foreground: "#0f172a",
        card: {
          DEFAULT: "#f8fafc",
          foreground: "#0f172a",
        },
        primary: {
          DEFAULT: "#155dfc",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#155dfc",
          foreground: "#0f172a",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        accent: {
          DEFAULT: "#155dfc",
          foreground: "#ffffff",
        },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#38bdf8",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      animation: {
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #38bdf8, 0 0 10px #38bdf8, 0 0 15px #38bdf8" },
          "100%": { boxShadow: "0 0 10px #38bdf8, 0 0 20px #38bdf8, 0 0 30px #38bdf8" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
