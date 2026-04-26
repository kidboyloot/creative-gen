/** @type {import('tailwindcss').Config} */
// â–¶ Substitui o teu: testessitesbonitos/creative-gen/frontend/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Surfaces â€” mais pretas e mais neutras (como no redesign) */
        surface: {
          50: '#f8f9fa',
          100: '#2a2a35',
          200: '#23232e',
          300: '#1a1a24',
          400: '#16161f',
          500: '#13131b',
          600: '#0e0e14',
          700: '#0b0b10',
          800: '#0a0a0e',
          900: '#08080c',
        },
        /* NOVO: brand = violeta (HSL 262 83% 62%) */
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',   // â† accent principal
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        /* accent = alias de brand para compatibilidade */
        accent: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        /* Studio palette — used by Image / Video / Chat / Spaces / Lip Sync / Cinema */
        studio: {
          primary: '#d9ff00',
          'primary-hover': '#c4e600',
          'app-bg': '#050505',
          'panel-bg': '#0a0a0a',
          'card-bg': '#141414',
          'card-bg-2': '#1a1a1a',
          secondary: '#a1a1aa',
          muted: '#52525b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xl': '10px',
        '2xl': '14px',
        '3xl': '18px',
        '4xl': '24px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.25)',
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.15)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.35)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139,92,246,0.25)',
        'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'elevated': '0 20px 60px rgba(0, 0, 0, 0.5)',
        'studio-glow': '0 0 20px rgba(217, 255, 0, 0.4)',
        'studio-glow-sm': '0 0 10px rgba(217, 255, 0, 0.25)',
        'studio-3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}