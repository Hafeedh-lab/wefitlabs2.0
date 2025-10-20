import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        wefit: {
          primary: '#00C875',
          'primary-hover': '#00E287',
          dark: '#111214',
          'dark-muted': '#1A1B1D',
          white: '#FFFFFF',
          grey: '#A0A0A0',
          gold: '#FFC84A',
          success: '#33DD90',
          error: '#FF4A4A'
        },
        status: {
          pending: '#A0A0A0',
          active: '#00C875',
          completed: '#33DD90'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        wefit: '0 4px 20px rgba(0, 200, 117, 0.15)',
        'wefit-lg': '0 8px 40px rgba(0, 200, 117, 0.25)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        celebrate: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        },
        'pulse-green': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        celebrate: 'celebrate 0.5s ease-in-out',
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite'
      },
      screens: {
        xs: '375px'
      }
    }
  },
  plugins: []
};

export default config;
