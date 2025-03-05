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
        dark: {
          100: "var(--dark-100)",
          200: "var(--dark-200)",
        },
        light: {
          100: "var(--light-100)",
          200: "var(--light-200)",
        },
        primary: {
          100: "var(--primary-100)",
        }
      },
    },
  },
  plugins: [],
} satisfies Config;
