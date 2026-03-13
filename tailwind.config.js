/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8ecf2',
          100: '#c5cede',
          200: '#9eafc7',
          300: '#7790b0',
          400: '#5a799f',
          500: '#3d628e',
          600: '#345681',
          700: '#294670',
          800: '#1a2d50',
          900: '#0a1225',
          950: '#060e1c',
        },
        sky: {
          50: '#e6f6fe',
          100: '#c0e8fc',
          200: '#96dafa',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#38bdf8',
          600: '#30aae4',
          700: '#2691cb',
          800: '#1d79b3',
          900: '#0e528a',
        },
        gold: {
          50: '#fef7e0',
          100: '#fdecb3',
          200: '#fce080',
          300: '#fbd44d',
          400: '#fbbf24',
          500: '#fbbf24',
          600: '#f5b020',
          700: '#ed9c1b',
          800: '#e58816',
          900: '#d9650d',
        },
        success: '#4ade80',
        error: '#ef4444',
        warning: '#f59e0b',
        muted: '#64748b',
        surface: 'rgba(255,255,255,0.04)',
        'surface-raised': 'rgba(255,255,255,0.07)',
        'surface-overlay': 'rgba(255,255,255,0.10)',
        'border-subtle': 'rgba(255,255,255,0.08)',
        'border-medium': 'rgba(255,255,255,0.12)',
        darkest: '#060e1c',
      },
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
