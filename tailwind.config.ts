import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#EEF2ED',
          100: '#C8D8C5',
          200: '#A2BE9D',
          400: '#6A9E63',
          600: '#4A6741',
          700: '#3D5936',
          800: '#2D5028',
          900: '#1A3017',
        },
        warm: {
          50:  '#FAF7F2',
          100: '#F0E8D8',
          200: '#E0CEAF',
          400: '#C4A06B',
          600: '#8C6D3F',
          800: '#5C4220',
          900: '#3A2810',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
