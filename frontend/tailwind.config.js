/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark palette inspired by Lando Norris site
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#111111',
        'bg-card': '#161616',
        'bg-elevated': '#1c1c1c',
        'text-primary': '#FFFFFF',
        'text-secondary': '#888888',
        'text-muted': '#555555',

        // Lime accent (like Lando Norris)
        'accent': '#CCFF00',
        'accent-dark': '#99CC00',
        'accent-glow': 'rgba(204, 255, 0, 0.15)',

        // Secondary colors
        'lime': '#CCFF00',
        'profit': '#CCFF00',
        'gain': '#CCFF00',
        'loss': '#FF4444',
        'warning': '#FFAA00',

        // Borders
        'border': 'rgba(255, 255, 255, 0.08)',
        'border-hover': 'rgba(255, 255, 255, 0.15)',
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Aggressive display typography like Lando site
        'hero': ['8rem', { lineHeight: '0.9', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display-xl': ['6rem', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg': ['4rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-md': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      animation: {
        'fadeIn': 'fadeIn 0.8s cubic-bezier(0.65, 0.05, 0, 1)',
        'fadeInUp': 'fadeInUp 0.8s cubic-bezier(0.65, 0.05, 0, 1)',
        'fadeInDown': 'fadeInDown 0.8s cubic-bezier(0.65, 0.05, 0, 1)',
        'slideUp': 'slideUp 0.8s cubic-bezier(0.65, 0.05, 0, 1)',
        'slideDown': 'slideDown 0.6s cubic-bezier(0.65, 0.05, 0, 1)',
        'slideIn': 'slideIn 0.6s cubic-bezier(0.65, 0.05, 0, 1)',
        'slideInLeft': 'slideInLeft 0.8s cubic-bezier(0.65, 0.05, 0, 1)',
        'slideInRight': 'slideInRight 0.8s cubic-bezier(0.65, 0.05, 0, 1)',
        'scaleIn': 'scaleIn 0.6s cubic-bezier(0.65, 0.05, 0, 1)',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'marquee': 'marquee 25s linear infinite',
        'marquee-slow': 'marquee 40s linear infinite',
        'marquee-reverse': 'marquee-reverse 25s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'line-reveal': 'lineReveal 0.8s cubic-bezier(0.65, 0.05, 0, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(60px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-60px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(60px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        lineReveal: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.65, 0.05, 0, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(204, 255, 0, 0.1)',
        'glow': '0 0 40px rgba(204, 255, 0, 0.15)',
        'glow-lg': '0 0 80px rgba(204, 255, 0, 0.2)',
        'glow-xl': '0 0 120px rgba(204, 255, 0, 0.25)',
        'glow-profit': '0 0 40px rgba(204, 255, 0, 0.15)',
        'glow-loss': '0 0 40px rgba(255, 68, 68, 0.15)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.7)',
        'inner-glow': 'inset 0 0 60px rgba(204, 255, 0, 0.03)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(204, 255, 0, 0.15), transparent)',
        'card-gradient': 'linear-gradient(180deg, rgba(204, 255, 0, 0.03) 0%, transparent 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
