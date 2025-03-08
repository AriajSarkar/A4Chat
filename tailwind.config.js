/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.html",
    "./src/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#bddaff',
          300: '#85bfff',
          400: '#4a9eff',
          500: '#1a7fff',
          600: '#0062e6',
          700: '#004ecc',
          800: '#0041a8',
          900: '#003380',
        },
        brand: {
          light: '#7CC2FF', // Light blue (🩵)
          default: '#0075FF', // Main blue (💙)
          dark: '#0055CC',
          50: '#E6F3FF',
          100: '#CCE7FF',
          200: '#99CFFF',
          300: '#66B7FF',
          400: '#339FFF',
          500: '#0075FF',
          600: '#005ECC',
          700: '#004799',
          800: '#002F66',
          900: '#001833',
        },
        surface: {
          light: '#FFFFFF',
          default: '#F8FAFC',
          dark: '#111827',
        },
        gray: {
          750: '#2D3748', // Between 700 and 800
          850: '#1A202C', // Between 800 and 900
        },
      },
      keyframes: {
        modelDropdown: {
          '0%': { transform: 'scale(0.95) translateY(-10px)', opacity: 0 },
          '100%': { transform: 'scale(1) translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.95' }
        },
        typewriterCursor: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 }
        },
        fadeInUp: {
          '0%': { 
            opacity: 0,
            transform: 'translateY(10px)'
          },
          '100%': { 
            opacity: 1,
            transform: 'translateY(0)'
          }
        },
        bubbleIn: {
          '0%': { 
            opacity: 0,
            transform: 'translateY(5px) scale(0.98)'
          },
          '100%': { 
            opacity: 1,
            transform: 'translateY(0) scale(1)'
          }
        },
        fadeInUpShort: {
          '0%': { 
            opacity: 0,
            transform: 'translateY(5px)'
          },
          '100%': { 
            opacity: 1,
            transform: 'translateY(0)'
          }
        },
        scaleIn: {
          '0%': {
            opacity: 0,
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1)'
          }
        }
      },
      animation: {
        modelDropdown: 'modelDropdown 0.2s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-up': 'fadeUp 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        typing: 'typing 3.5s steps(40, end)',
        'cursor-blink': 'blink 1s step-end infinite',
        'pulse-subtle': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typewriter-blink': 'typewriterCursor 0.7s step-end infinite',
        'fade-in-up': 'fadeInUp 0.2s ease-out forwards',
        'bubble-in': 'bubbleIn 0.3s ease-out forwards',
        'fade-in-up-short': 'fadeInUpShort 0.15s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
      animationDelay: {
        '200ms': '200ms',
        '400ms': '400ms',
      },
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            'blockquote p:first-of-type::before': { content: '""' },
            'blockquote p:last-of-type::after': { content: '""' },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      const newUtilities = {
        '.animation-delay-200': {
          'animation-delay': '0.2s',
        },
        '.animation-delay-400': {
          'animation-delay': '0.4s',
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
        },
        '.scrollbar-thumb-gray-300': {
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#D1D5DB',
            borderRadius: '3px',
          },
        },
        '.scrollbar-thumb-gray-700': {
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#374151',
            borderRadius: '3px',
          },
        },
        '.scrollbar-track-transparent': {
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      }
      addUtilities(newUtilities)
    }
  ],
}

