import type { Config } from 'tailwindcss';

// Tokens are DESIGN.md verbatim: dark base, red as accent-only, gold sparingly,
// navy for depth. Radius 16 (cards/buttons) / 12 (inputs).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0E0F12',
        surface: '#1A1C20',
        raised: '#24272C',
        border: '#2E3238',
        text: { DEFAULT: '#FFFFFF', secondary: '#A8ADB5' },
        red: { DEFAULT: '#EF0107', dark: '#DB0007' },
        gold: '#9C824A',
        navy: '#063672',
      },
      borderRadius: { card: '16px', input: '12px' },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        hero: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { content: '1100px' },
    },
  },
  plugins: [],
};

export default config;
