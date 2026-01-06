/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A1C20',
        accent: '#C5A059',
        page: '#F8F9FA',
      },
      borderRadius: {
        'card': '32px',
        'xlcard': '48px',
      },
      boxShadow: {
        'soft-card': '0 10px 30px rgba(26,28,32,0.08)',
        'soft-md': '0 6px 18px rgba(26,28,32,0.06)'
      },
    },
  },
  plugins: [],
}
