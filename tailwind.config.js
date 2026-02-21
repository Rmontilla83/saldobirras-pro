/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#080D19', 2: '#0C1324', 3: '#111A30' },
        navy: { DEFAULT: '#1B2A4A', light: '#243B6A' },
        amber: { DEFAULT: '#F5A623', light: '#FFD080', dark: '#C48415' },
        gn: { DEFAULT: '#00D68F', dark: '#00A86B' },
        rd: { DEFAULT: '#FF4757', dark: '#CC3A47' },
        muted: '#7B8DB5',
        dim: '#4A5A7A',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};
