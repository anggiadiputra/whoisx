const defaultTheme = require('tailwindcss/defaultTheme')

// Design system "Berani" (see design.md). Colors are added here first, never as loose hex in components.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // Text, and the single dark surface per page
        ink: { DEFAULT: '#111318', soft: '#1e212b', line: '#2e323e' },
        cream: '#f3f1ec',
        sand: '#e8e4da',
        // Secondary text (AA on cream and white)
        muted: { DEFAULT: '#5a5d69', foreground: '#5a5d69' },

        violet: { DEFAULT: '#5b3df5', dark: '#4526d9' },
        lime: { DEFAULT: '#c6f432' },
        lilac: '#e6e0ff',
        mint: '#d9f5e5',
        peach: '#ffe3d3',
        sky: { DEFAULT: '#dbeeff' },
        butter: '#fff0b8',
        rose: { DEFAULT: '#ffd9dc', dark: '#ffc4c9' },

        // Status text on its pastel fill (contrast >= 4.5:1)
        st: { wait: '#6b4a00', rev: '#8f3300', no: '#a3122a', draft: '#3d404b' },
        // Text on pastel
        on: { mint: '#17603b', peach: '#9a3b0b', sky: '#135a8c' },

        // shadcn names used by the ui primitives, mapped onto the tokens above
        border: '#e8e4da',
        input: '#e8e4da',
        ring: '#5b3df5',
        background: '#f3f1ec',
        foreground: '#111318',
        primary: { DEFAULT: '#5b3df5', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f3f1ec', foreground: '#111318' },
        destructive: { DEFAULT: '#ffd9dc', foreground: '#a3122a' },
        accent: { DEFAULT: '#e6e0ff', foreground: '#4526d9' },
        popover: { DEFAULT: '#ffffff', foreground: '#111318' },
        card: { DEFAULT: '#ffffff', foreground: '#111318' },
      },
      borderRadius: {
        tile: '20px',
        card: '24px',
        hero: '28px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(17 19 24 / 0.04), 0 14px 32px -18px rgb(17 19 24 / 0.22)',
        float: '0 18px 40px -14px rgb(17 19 24 / 0.38)',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(16deg)' },
          '30%': { transform: 'rotate(-8deg)' },
          '45%': { transform: 'rotate(14deg)' },
          '60%': { transform: 'rotate(-4deg)' },
          '75%': { transform: 'rotate(10deg)' },
        },
      },
      animation: {
        wave: 'wave 2.2s ease-in-out 1',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
