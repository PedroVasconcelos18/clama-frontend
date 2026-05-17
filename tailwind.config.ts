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
        // Blog tokens — alinhados à paleta dark (night/gold/cream) do MVP.
        // Mantidos como aliases pra evitar tocar cada componente.
        "clama-blog-gold-deep": "#f0c040", // = clama-gold
        "clama-blog-gold-soft": "#f5d77a", // soft accent (mantido)
        "clama-blog-purple-prose": "#fdf8f0", // = clama-cream (texto)
        "clama-blog-cream-warm": "#2a1a40", // = clama-night-soft (hover/bg secondary)
        "clama-blog-comment-bg": "#110720", // = clama-night-deep (card bg)
        "clama-blog-border-soft": "#2a1a40", // = clama-night-soft (border discreta)
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
            color: "#fdf8f0",
            maxWidth: "65ch",
            "@screen md": {
              fontSize: "1.1875rem",
            },
            h1: { color: "#fdf8f0", fontFamily: "Georgia, serif", fontWeight: "700" },
            h2: { color: "#fdf8f0", fontFamily: "Georgia, serif", fontWeight: "700" },
            h3: { color: "#fdf8f0", fontFamily: "Georgia, serif", fontWeight: "700" },
            h4: { color: "#fdf8f0", fontFamily: "Georgia, serif", fontWeight: "700" },
            strong: { color: "#fdf8f0" },
            a: { color: "#f0c040", textDecoration: "underline" },
            "a:hover": { color: "#d4a017" },
            blockquote: { color: "#fdf8f0", borderLeftColor: "rgba(240, 192, 64, 0.4)" },
            code: { color: "#f5d77a" },
            "blockquote.versiculo": {
              backgroundColor: "rgba(240, 192, 64, 0.12)",
              color: "#fdf8f0",
              borderLeftWidth: "4px",
              borderLeftColor: "#f0c040",
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
                color: "#f0c040",
              },
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config
