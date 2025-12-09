/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fecdca',
          300: '#fdaaa4',
          400: '#fa7970',
          500: '#f04438',
          600: '#de2f24',
          700: '#bc241a',
          800: '#9b221a',
          900: '#80231c',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        dark: {
          50: '#f6f6f7',
          100: '#e1e3e5',
          200: '#c2c8ce',
          300: '#9ba4af',
          400: '#717c8a',
          500: '#5c6570',
          600: '#464e58',
          700: '#3a4047',
          800: '#33373d',
          900: '#1a1d23',
          950: '#0f1114',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
