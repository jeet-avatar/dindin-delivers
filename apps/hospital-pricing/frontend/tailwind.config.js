/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] },
      colors: {
        background: '#020617',
        surface: '#0E1223',
        border: '#334155',
        primary: '#2563EB',
        accent: '#22C55E',
        destructive: '#EF4444',
        warning: '#D97706',
        'text-primary': '#F8FAFC',
        'text-muted': '#94A3B8',
      },
    },
  },
  plugins: [],
}
