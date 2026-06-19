import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "../../packages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "1.5rem",
        md: "1rem",
        sm: "0.5rem"
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px rgba(15,23,42,1)",
        "brutal-sm": "2px 2px 0px 0px rgba(15,23,42,1)",
        "brutal-lg": "8px 8px 0px 0px rgba(15,23,42,1)"
      },
      animation: {
        glow:        "glow 2s ease-in-out infinite alternate",
        shake:       "shake 0.4s ease-in-out",
        "pop-in":    "pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up":  "slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "xp-pop":    "xp-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        "streak-glow":"streak-glow 1.6s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%":   { boxShadow: "0 0 5px #38bdf8, 0 0 10px #38bdf8, 0 0 15px #38bdf8" },
          "100%": { boxShadow: "0 0 10px #38bdf8, 0 0 20px #38bdf8, 0 0 30px #38bdf8" }
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":       { transform: "translateX(-6px)" },
          "40%":       { transform: "translateX(6px)" },
          "60%":       { transform: "translateX(-4px)" },
          "80%":       { transform: "translateX(4px)" }
        },
        "pop-in": {
          "0%":   { transform: "scale(0.4)", opacity: "0" },
          "60%":  { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)",   opacity: "1" }
        },
        "slide-up": {
          "0%":   { transform: "translateY(18px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" }
        },
        "xp-pop": {
          "0%":   { transform: "scale(0) rotate(-12deg)", opacity: "0" },
          "55%":  { transform: "scale(1.15) rotate(4deg)" },
          "100%": { transform: "scale(1) rotate(0deg)",   opacity: "1" }
        },
        "streak-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,150,0,0)",    transform: "scale(1)" },
          "50%":       { boxShadow: "0 0 48px 16px rgba(255,150,0,0.35)", transform: "scale(1.04)" }
        }
      }
    }
  },
  plugins: []
}

export default config
