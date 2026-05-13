import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Clama design tokens
        "clama-night": "#1a0a2e",
        "clama-night-deep": "#110720",
        "clama-night-soft": "#2a1a40",
        "clama-gold": "#f0c040",
        "clama-gold-soft": "#d4a017",
        "clama-cream": "#fdf8f0",
        "clama-cream-warm": "#f5ecd9",
        "clama-accent": "#8a5cf6",
        // Blog-specific tokens (Story 1.5 — não colidem com MVP)
        "clama-blog-gold-deep": "#b8862a",
        "clama-blog-gold-soft": "#f5d77a",
        "clama-blog-purple-prose": "#3a1f5c",
        "clama-blog-cream-warm": "#faf3e8",
        "clama-blog-comment-bg": "#ffffff",
        "clama-blog-border-soft": "#e8e0d0",
        // shadcn CSS variable colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "clama-card": "16px",
      },
      fontFamily: {
        serif: ["Georgia", '"Times New Roman"', "serif"],
        sans: ["-apple-system", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      keyframes: {
        "fade-in-comment": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-comment": "fade-in-comment 300ms ease-out",
      },
      typography: {
        clama: {
          css: {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "1.125rem",
            lineHeight: "1.7",
            color: "#3a1f5c",
            maxWidth: "65ch",
            "@screen md": {
              fontSize: "1.1875rem",
            },
            h2: { fontFamily: "Georgia, serif", fontWeight: "700" },
            h3: { fontFamily: "Georgia, serif", fontWeight: "700" },
            a: { color: "#b8862a" },
            "blockquote.versiculo": {
              backgroundColor: "#b8862a",
              color: "#fdf8f0",
              borderLeftWidth: "4px",
              borderLeftColor: "#f5d77a",
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem",
              paddingTop: "1rem",
              paddingBottom: "1rem",
              marginTop: "1.5rem",
              marginBottom: "1.5rem",
              borderRadius: "0.375rem",
              fontStyle: "italic",
              fontSize: "1.25rem",
              fontWeight: "400",
              fontFamily: "Georgia, serif",
              quotes: "none",
              "&::before": { content: "none" },
              "&::after": { content: "none" },
              "& > p": {
                color: "#fdf8f0",
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontWeight: "400",
              },
              "& > p::before, & > p::after": { content: "none" },
              "& > cite": {
                display: "block",
                marginTop: "0.5rem",
                fontStyle: "normal",
                fontSize: "0.875rem",
                fontFamily: "Georgia, serif",
                opacity: "0.85",
              },
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config
