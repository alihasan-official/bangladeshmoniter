/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0d0e12',
          panel: '#12141a',
          border: '#1a1d24',
          emerald: '#006a4e',
          crimson: '#ff3b30',
        }
      }
    },
  },
  plugins: [],
}
