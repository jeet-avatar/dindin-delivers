import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1d4ed8',
          light: '#3b82f6',
        },
        cta: {
          DEFAULT: '#F97316',
          dark: '#ea6d07',
          light: '#fb923c',
        },
        brand: {
          blue: '#1a3a8f',
          silver: '#c0c0c0',
          'blue-dark': '#122970',
          'blue-light': '#2a5abf',
        },
      },
      fontFamily: {
        heading: ['var(--font-figtree)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-noto-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
