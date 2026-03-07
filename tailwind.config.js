/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hyperliquid-dark': '#0a0e27',
        'hyperliquid-darker': '#0f1428',
        'hyperliquid-bg': '#1a1f3a',
      },
      fontFamily: {
        'mono': ['Space Mono', 'monospace'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
