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
        // Partner portal palette (restaurant owner screens)
        brand: {
          DEFAULT: '#C2381F',
          hover: '#A92E18',
          light: '#FDF3EE',
          soft: '#F8E4DA',
        },
        cream: '#FFFBF8',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
