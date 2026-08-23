/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: '#1a0810',
          50: '#fdf2f8',
          100: '#f9e0ee',
          200: '#f4c1dd',
          300: '#ea93c0',
          400: '#d95e99',
          500: '#c33d7a',
          600: '#a52c5e',
          700: '#861f46',
          800: '#6f1d3c',
          900: '#5e1c34',
          950: '#3a0a1c',
          deep: '#7A1F2B',
          bg: '#12090f',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#FBF5B7',
          dark: '#AA771C',
          gradient: {
            start: '#DFBA67',
            mid: '#C59B27',
            end: '#9E7412',
          },
        },
        rose: {
          DEFAULT: '#FF6B9D',
        },
      },
      fontFamily: {
        'serif-romantic': ['PlayfairDisplay_700Bold', 'Georgia', 'serif'],
        'serif-romantic-regular': ['PlayfairDisplay_400Regular', 'Georgia', 'serif'],
        'serif-romantic-italic': ['PlayfairDisplay_400Regular_Italic', 'Georgia', 'serif'],
        'body': ['BeVietnamPro_400Regular', 'sans-serif'],
        'body-medium': ['BeVietnamPro_500Medium', 'sans-serif'],
        'body-semibold': ['BeVietnamPro_600SemiBold', 'sans-serif'],
        'body-bold': ['BeVietnamPro_700Bold', 'sans-serif'],
        'body-light': ['BeVietnamPro_300Light', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
