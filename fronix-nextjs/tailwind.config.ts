
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        'work-sans': ['Work Sans', 'sans-serif'],
        'yu-gothic': ['Yu Gothic', 'sans-serif'],
        'sans-serif': ['ui-sans-serif', 'system-ui', '-apple-system'],
      },
      borderRadius: {
        '3xl': '24px',
      },
      colors: {
        light: {
          background: '#FFFFFF',
          sidebar: '#F7F7F8',
          'user-bubble': '#F0F0F0',
          'chat-surface': '#FFFFFF',
          border: '#E5E5E6',
          'border-hover': '#ECECEC',
          'border-active': '#E0E0E0',
          text: {
            DEFAULT: '#18181B',
            subtle: '#6B7280',
          },
        },
        dark: {
          background: '#121212',
          sidebar: '#1C1C1C',
          'user-bubble': '#2C2C2C',
          'chat-surface': '#121212',
          border: '#3A3A3A',
          'border-hover': '#2A2A2A',
          'border-active': '#303030',
          text: {
            DEFAULT: '#EAEAEA',
            subtle: '#A1A1AA',
          },
        },
        accent: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
} satisfies Config

export default config
