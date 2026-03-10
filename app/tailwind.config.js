/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#1E293B',
      }
    },
  },
  plugins: [],
}
