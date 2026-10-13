import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary action colour (violet), used for CTAs, links and selected states
        brand: {
          50: "#f5f1ff",
          100: "#ece5ff",
          200: "#dacdff",
          300: "#bfa8ff",
          400: "#9b78fa",
          500: "#6e42e5",
          600: "#5c33cc",
          700: "#4c29a8",
          800: "#3f2488",
          900: "#34206f",
          950: "#1f1247",
        },
        accent: {
          50: "#ecfbf3",
          100: "#d1f5e2",
          200: "#a6eac7",
          300: "#6fd8a6",
          400: "#38bf81",
          500: "#0f9d63",
          600: "#07794c",
          700: "#086240",
          800: "#0a4e35",
          900: "#0a402d",
        },
        surface: {
          50: "#f7f7f7",
          100: "#f2f2f2",
          200: "#e6e6e6",
          300: "#d4d4d4",
          400: "#a3a3a3",
        },
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e6e6e6",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#757575",
          600: "#545454",
          700: "#3d3d3d",
          800: "#262626",
          900: "#0f0f0f",
          950: "#080808",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#e5484d",
          600: "#d13438",
          700: "#b02a2e",
        },
        warning: {
          50: "#fffaeb",
          100: "#fef0c7",
          200: "#fedf89",
          300: "#fec84b",
          400: "#fdb022",
          500: "#f79009",
          600: "#dc6803",
          700: "#b54708",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        "card-hover": "0 8px 20px -6px rgb(0 0 0 / 0.12)",
        pop: "0 16px 40px -8px rgb(0 0 0 / 0.16), 0 4px 12px -4px rgb(0 0 0 / 0.06)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        shimmer: "shimmer 1.5s infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.21, 1.02, 0.73, 1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) both",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "ken-burns": "ken-burns 18s ease-out both",
        "page-in": "fade-in 0.35s ease-out both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
