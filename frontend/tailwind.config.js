/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:    "#4ADE80",
        neon:       "#6FFF00",
        cream:      "#EFF4FF",
        background: "#010828",
        surface:    "#191C21",
        accent:     "#10B981",
      },
      fontFamily: {
        grotesk:   ["Anton", "sans-serif"],
        condiment: ["Condiment", "cursive"],
        pixel:     ["Pixelify Sans", "sans-serif"],
        mono:      ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card:    "8px",
        control: "8px",
        pill:    "9999px",
      },
    },
  },
  plugins: [],
}
