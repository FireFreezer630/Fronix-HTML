/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
        'source-code': ['Source Code Pro', 'monospace'],
        'fira': ['Fira Code', 'monospace'],
        'roboto': ['Roboto Mono', 'monospace'],
        'ubuntu': ['Ubuntu Mono', 'monospace'],
        'cascadia': ['Cascadia Code', 'monospace'],
        'consolas': ['Consolas', 'monospace'],
        'menlo': ['Menlo', 'monospace'],
        'monaco': ['Monaco', 'monospace'],
      },
      colors: {
        'dark-bg': '#0f0f0f',
        'dark-surface': '#1a1a1a',
        'dark-border': '#2a2a2a',
        'dark-text': '#e5e5e5',
        'dark-text-secondary': '#a3a3a3',
        'light-bg': '#ffffff',
        'light-surface': '#f8f9fa',
        'light-border': '#e5e7eb',
        'light-text': '#1f2937',
        'light-text-secondary': '#6b7280',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}