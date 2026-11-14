/** @type {import('tailwindcss').Config} */

// Design tokens. See CLAUDE.md §5 "Design system".
// Client palette (2026-11): Midnight Black #030407 · Electric Cobalt Blue #1558C9 · Acid Lime #D4FF24.
// brand = Electric Cobalt (primary accent), ink = Midnight neutrals, lime = Acid Lime highlight / CTA fill
// (use lime as a FILL with ink-950 text; lime text only on dark backgrounds). gold = functional warning (dues).
const brand = {
  50: "#EEF4FF", 100: "#DAE6FD", 200: "#BCD2FB", 300: "#8EB4F7", 400: "#5A8EF0",
  500: "#2F6BE0", 600: "#1558C9", 700: "#1246A3", 800: "#133C84", 900: "#15356B", 950: "#0F2246",
};
const ink = {
  50: "#F6F7F9", 100: "#ECEDF1", 200: "#D8DAE0", 300: "#B4B8C2", 400: "#858B98",
  500: "#5A606E", 600: "#3B404D", 700: "#262A35", 800: "#171A22", 900: "#0B0D12", 950: "#030407",
};
const lime = {
  50: "#FAFFE5", 100: "#F3FFC2", 200: "#EAFF8A", 300: "#DFFF52", 400: "#D4FF24",
  500: "#B9E600", 600: "#92B500", 700: "#6E8900", 800: "#556A04", 900: "#47580A",
};
const gold = { 200: "#F8E7BC", 300: "#F5D58A", 400: "#EDBE57", 500: "#D9A23A", 600: "#B7832A" };

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand,
        ink,
        gold,
        lime,
        // Legacy aliases so older class names keep matching the new palette.
        // slate-* is used throughout the pages; mapping it to ink makes every
        // neutral in the app pick up the new cool, premium greys.
        slate: ink,
        navy: { DEFAULT: ink[950], light: ink[900], xl: ink[800] },
        teal: { DEFAULT: brand[600], dark: brand[700], light: brand[400] },
        amber: { DEFAULT: gold[400], light: gold[300] },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(3,4,7,0.04), 0 0 0 1px rgba(3,4,7,0.05)",
        lift: "0 1px 2px rgba(3,4,7,0.05), 0 8px 24px -8px rgba(3,4,7,0.12), 0 0 0 1px rgba(3,4,7,0.05)",
        popover: "0 24px 48px -12px rgba(3,4,7,0.4), 0 0 0 1px rgba(3,4,7,0.06)",
        "glow-teal": "0 10px 30px -8px rgba(21,88,201,0.6)",
        "glow-lime": "0 10px 32px -8px rgba(212,255,36,0.55)",
        "glow-gold": "0 10px 30px -8px rgba(237,190,87,0.5)",
        "inner-hair": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: "scale(0.97) translateY(4px)" }, to: { opacity: 1, transform: "scale(1) translateY(0)" } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideInLeft: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        glide: { "0%": { strokeDashoffset: "0" }, "100%": { strokeDashoffset: "-1000" } },
        rise: { from: { opacity: 0, transform: "translateY(24px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        itemIn: { from: { opacity: 0, transform: "translateX(18px)" }, to: { opacity: 1, transform: "translateX(0)" } },
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out",
        scaleIn: "scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)",
        slideUp: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
        slideInLeft: "slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)",
        glide: "glide 14s linear infinite",
        rise: "rise 0.7s cubic-bezier(0.16,1,0.3,1) both",
        itemIn: "itemIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
