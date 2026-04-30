import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        profit: "#39ff14",
        loss: "#ff2d78",
        "neon-cyan": "#00f0ff",
        "neon-magenta": "#ff2d78",
        "neon-green": "#39ff14",
        "neon-purple": "#b44dff",
        "neon-amber": "#ffb800",
        "neon-blue": "#4d79ff",
        "cyber-black": "#0a0a0f",
        "cyber-950": "#0d0d14",
        "cyber-900": "#12121c",
        "cyber-850": "#181825",
        "cyber-800": "#1e1e2e",
        "cyber-700": "#2a2a3d",
        "cyber-600": "#3a3a52",
        "cyber-500": "#525270",
        "cyber-400": "#7a7a99",
        "cyber-300": "#a0a0bd",
        "cyber-200": "#c8c8e0",
        "cyber-100": "#e8e8f4",
      },
      fontFamily: {
        display: ['"Orbitron"', "sans-serif"],
        body: ['"Exo 2"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        "neon-cyan-sm":
          "0 0 8px rgba(0, 240, 255, 0.15), 0 0 2px rgba(0, 240, 255, 0.1)",
        "neon-cyan":
          "0 0 15px rgba(0, 240, 255, 0.2), 0 0 4px rgba(0, 240, 255, 0.15)",
        "neon-cyan-lg":
          "0 0 25px rgba(0, 240, 255, 0.25), 0 0 8px rgba(0, 240, 255, 0.2)",
        "neon-green-sm":
          "0 0 8px rgba(57, 255, 20, 0.15), 0 0 2px rgba(57, 255, 20, 0.1)",
        "neon-green":
          "0 0 15px rgba(57, 255, 20, 0.2), 0 0 4px rgba(57, 255, 20, 0.15)",
        "neon-magenta-sm":
          "0 0 8px rgba(255, 45, 120, 0.15), 0 0 2px rgba(255, 45, 120, 0.1)",
        "neon-magenta":
          "0 0 15px rgba(255, 45, 120, 0.2), 0 0 4px rgba(255, 45, 120, 0.15)",
        "neon-purple":
          "0 0 15px rgba(180, 77, 255, 0.2), 0 0 4px rgba(180, 77, 255, 0.15)",
        card: "0 0 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(0, 240, 255, 0.05)",
        "card-hover":
          "0 0 25px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 240, 255, 0.1)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(0, 240, 255, 0.15)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 240, 255, 0.3)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.8" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.9" },
          "97%": { opacity: "1" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(0, 240, 255, 0.2)" },
          "50%": { borderColor: "rgba(0, 240, 255, 0.5)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        flicker: "flicker 4s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
