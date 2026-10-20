import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          container: "var(--color-primary-container)",
        },
        "on-primary": {
          DEFAULT: "var(--color-on-primary)",
          container: "var(--color-on-primary-container)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
        },
        background: "var(--color-background)",
        surface: {
          DEFAULT: "var(--color-surface)",
        },
        "on-surface": {
          DEFAULT: "var(--color-on-surface)",
          muted: "var(--color-on-surface-muted)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        "border-strong": "var(--color-border-strong)",
        event: {
          eyes: "var(--color-event-eyes)",
          head: "var(--color-event-head)",
          away: "var(--color-event-away)",
        },
        caution: {
          DEFAULT: "var(--color-caution)",
          container: "var(--color-caution-container)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          container: "var(--color-info-container)",
        },
        experimental: {
          DEFAULT: "var(--color-experimental)",
          container: "var(--color-experimental-container)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          container: "var(--color-success-container)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          container: "var(--color-error-container)",
        },
        "on-error": {
          DEFAULT: "var(--color-on-error)",
          container: "var(--color-on-error-container)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        full: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        h1: ["1.75rem", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-md": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        label: ["0.875rem", { lineHeight: "1.4", fontWeight: "600" }],
        caption: ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }],
        metric: ["2rem", { lineHeight: "1.1", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};

export default config;
