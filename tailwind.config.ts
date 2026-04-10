import type { Config } from "tailwindcss"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "clama-night": "#1a0a2e",
        "clama-night-deep": "#110720",
        "clama-night-soft": "#2a1a40",
        "clama-gold": "#f0c040",
        "clama-gold-soft": "#d4a017",
        "clama-cream": "#fdf8f0",
        "clama-cream-warm": "#f5ecd9",
        "clama-accent": "#8a5cf6",
      },
      fontFamily: {
        serif: ["Georgia", '"Times New Roman"', "serif"],
        sans: ["-apple-system", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
