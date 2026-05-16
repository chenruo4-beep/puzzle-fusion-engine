import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          dark: '#3c3a37',
          light: '#f5f0eb',
          accent: '#b8a088',
          bg: '#e8e0d5',
          success: '#5a7a5a',
        },
        dark: {
          bg: '#1a1a1a',
          surface: '#2a2a2a',
          text: '#e8e0d5',
          accent: '#b8a088',
          border: '#3a3a3a',
        }
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;