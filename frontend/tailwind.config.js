/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D0D0D',
        'bg-secondary': '#1A1A1A',
        'bg-card': '#242424',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'accent': '#00D4FF',
        'profit': '#00FF88',
        'loss': '#FF4444',
        'warning': '#FFB800',
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out',
        'slideUp': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}