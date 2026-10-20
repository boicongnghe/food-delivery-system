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
          DEFAULT: '#FF642F',
          hover: '#E85420',
          light: '#FFF1EB',
          dark: '#C84214',
        },
        secondary: {
          DEFAULT: '#FFB800',
          hover: '#E0A200',
          light: '#FFF8E7',
        },
        tertiary: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#ECFDF5',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
