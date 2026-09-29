/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#121215',
        card: '#18181b',
        border: '#27272a',
        primary: {
          DEFAULT: '#10b981',
          hover: '#059669',
          light: '#d1fae5',
        },
      },
    },
  },
  plugins: [],
};
