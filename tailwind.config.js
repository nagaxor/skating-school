/** @type {import('tailwindcss').Config} */

// Design tokens. See CLAUDE.md §5 "Design system".
// brand = ice cyan (accent), ink = cool near-black neutrals, gold = premium highlight.
const brand = {
  50: "#ECFBFF", 100: "#CFF4FC", 200: "#A2E8F8", 300: "#63D5F0", 400: "#22BCE0",
  500: "#0A9FC4", 600: "#087FA3", 700: "#0C6684", 800: "#11536B", 900: "#13455A", 950: "#062C3C",
};
const ink = {
  50: "#F6F7FB", 100: "#ECEEF5", 200: "#D9DDEA", 300: "#B6BDD2", 400: "#8A93AF",
  500: "#66708E", 600: "#4C5573", 700: "#3A425C", 800: "#252B40", 900: "#161B2C", 950: "#0B0F1C",
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
        card: "0 1px 2px rgba(11,15,28,0.04), 0 0 0 1px rgba(11,15,28,0.05)",
        lift: "0 1px 2px rgba(11,15,28,0.05), 0 8px 24px -8px rgba(11,15,28,0.12), 0 0 0 1px rgba(11,15,28,0.05)",
        popover: "0 24px 48px -12px rgba(11,15,28,0.35), 0 0 0 1px rgba(11,15,28,0.06)",
        "glow-teal": "0 10px 30px -8px rgba(10,159,196,0.55)",
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
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out",
        scaleIn: "scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)",
        slideUp: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
        slideInLeft: "slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)",
        glide: "glide 14s linear infinite",
        rise: "rise 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
