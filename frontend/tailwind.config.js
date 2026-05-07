/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        crimson: { DEFAULT: '#B91C3C', light: '#E11D48', pale: '#FFF1F3' },
        sky:     { DEFAULT: '#0EA5E9', light: '#38BDF8', pale: '#F0F9FF' },
        navy:    { DEFAULT: '#0F2952', mid: '#1E3A6E' },
      },
    },
  },
  plugins: [],
}
