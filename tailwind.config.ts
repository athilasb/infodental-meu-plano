import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'krooa-green': '#D8FE64',
        'krooa-blue': '#30578D',
        'krooa-dark': '#001F2B',
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        'manrope': ['Manrope', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
} satisfies Config;