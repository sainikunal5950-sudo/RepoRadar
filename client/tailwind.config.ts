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
        background: "#0A0A0A",
        foreground: "#FAFAFA",
        surface: {
          DEFAULT: "#111111",
          elevated: "#181818",
          subtle: "#1F1F1F",
        },
        border: {
          DEFAULT: "#1F1F1F",
          light: "#2A2A2A",
          active: "#3A3A3A",
        },
        muted: {
          DEFAULT: "#737373",
          foreground: "#A3A3A3",
        },
        accent: {
          DEFAULT: "#FFFFFF",
          foreground: "#0A0A0A",
          glow: "rgba(255, 255, 255, 0.15)",
        },
        radar: {
          green: "#10B981",
          amber: "#F59E0B",
          cyan: "#06B6D4",
          violet: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, #1F1F1F 1px, transparent 1px), linear-gradient(to bottom, #1F1F1F 1px, transparent 1px)",
        "dot-pattern": "radial-gradient(circle, #2A2A2A 1px, transparent 1px)",
        "glow-gradient": "radial-gradient(50% 50% at 50% 50%, rgba(255, 255, 255, 0.08) 0%, rgba(10, 10, 10, 0) 100%)",
      },
      keyframes: {
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "radar-sweep": "radar-sweep 8s linear infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "float": "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
