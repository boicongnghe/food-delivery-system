/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF4B2B',
          hover: '#E03E20',
          light: '#FFF1EB',
          dark: '#C83214',
        },
        secondary: {
          DEFAULT: '#FFB800',
          hover: '#E0A200',
          light: '#FFF8E7',
        },
        crave: {
          red: '#FF416C',
          orange: '#FF4B2B',
          yellow: '#FFB800',
          cream: '#FFFDF9',
          dark: '#0F1014',
          surface: '#181A20',
          border: '#272A34',
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
        cream: '#FFFDF9',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

