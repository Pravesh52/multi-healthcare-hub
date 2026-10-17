// Colours come from CSS variables (see index.css), so one class works in light and dark mode
const withAlpha = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    // Written in full (not "extend") so that xs stays the smallest breakpoint
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        page: withAlpha('page'),
        card: withAlpha('card'),
        ink: withAlpha('ink'),
        muted: withAlpha('muted'),
        line: withAlpha('line'),
        soft: withAlpha('soft'),
        cross: withAlpha('cross'), // the red of the logo and emergency things
        star: '#F59E0B',
        'on-solid': withAlpha('on-solid'), // text colour on solid brand / ok / bad buttons
        brand: { DEFAULT: withAlpha('brand'), dark: withAlpha('brand-dark') },
        ok: { DEFAULT: withAlpha('ok'), soft: withAlpha('ok-soft') },
        bad: { DEFAULT: withAlpha('bad'), soft: withAlpha('bad-soft') },
        warn: { DEFAULT: withAlpha('warn'), soft: withAlpha('warn-soft') },
        foot: { DEFAULT: withAlpha('foot'), ink: withAlpha('foot-ink') },
      },
      fontFamily: {
        sans: ['Hind', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 22px rgb(var(--c-brand) / 0.12)',
        pop: '0 12px 30px rgb(0 0 0 / 0.25)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};