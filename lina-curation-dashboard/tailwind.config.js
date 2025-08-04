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
        'background': '#0A0A0A',
        'card': '#111111',
        'border-default': 'rgba(255, 255, 255, 0.1)',
        'border-hover': 'rgba(255, 255, 255, 0.2)',
        'text-primary': '#F3F3F3',
        'text-secondary': '#A3A3A3',
        'accent': 'rgb(0, 153, 255)',
        'green': {
          '50010': 'rgba(43, 178, 76, 0.1)',
        },
        'gray': {
          '80020': 'rgba(31, 41, 55, 0.2)',
          '80030': 'rgba(31, 41, 55, 0.3)',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.line-clamp-2': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};