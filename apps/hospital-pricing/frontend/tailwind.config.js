/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1e3a5f',
          light: '#2d5080',
          muted: '#93b4d4',
        },
        surface: '#f8fafc',
        'surface-card': '#ffffff',
        border: '#e2e8f0',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
