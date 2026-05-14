import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B2B5C",
          50: "#E6ECF5",
          100: "#C2D0E5",
          200: "#8FA6CA",
          300: "#5C7CAF",
          400: "#3A5A94",
          500: "#0B2B5C",
          600: "#092449",
          700: "#071C37",
          800: "#051527",
          900: "#030D18",
        },
        gold: {
          DEFAULT: "#C9A227",
          50: "#FBF5DC",
          100: "#F5E9AC",
          200: "#EDD86B",
          300: "#DDC141",
          400: "#C9A227",
          500: "#A98519",
          600: "#866812",
          700: "#634B0D",
          800: "#403008",
          900: "#241B04",
        },
        cream: "#F5F7FA",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(11, 43, 92, 0.05), 0 4px 12px rgba(11, 43, 92, 0.06)",
        hover: "0 2px 6px rgba(11, 43, 92, 0.08), 0 8px 24px rgba(11, 43, 92, 0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
