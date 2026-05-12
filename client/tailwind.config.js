/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          dark: '#1a4a2e',
          DEFAULT: '#2d6a4f',
          light: '#40916c',
        },
        card: {
          back: '#1e3a5f',
        },
      },
      animation: {
        'deal-in': 'dealIn 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 1.5s ease-in-out infinite',
        'chip-bounce': 'chipBounce 0.5s ease-out forwards',
      },
      keyframes: {
        dealIn: {
          '0%': { opacity: 0, transform: 'translateY(-40px) rotate(-10deg) scale(0.8)' },
          '100%': { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(251, 191, 36, 0.4)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(251, 191, 36, 0.8)' },
        },
        chipBounce: {
          '0%': { transform: 'translateY(-20px)', opacity: 0 },
          '60%': { transform: 'translateY(4px)', opacity: 1 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
