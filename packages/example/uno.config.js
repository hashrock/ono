import { defineConfig, presetUno, presetTypography } from "unocss";

export default defineConfig({
  presets: [
    presetUno(),
    presetTypography(),
  ],
  theme: {
    colors: {
      primary: {
        50: "#f0f9ff",
        100: "#e0f2fe",
        200: "#bae6fd",
        300: "#7dd3fc",
        400: "#38bdf8",
        500: "#0ea5e9",
        600: "#0284c7",
        700: "#0369a1",
        800: "#075985",
        900: "#0c4a6e",
      },
      accent: {
        DEFAULT: "#8b5cf6",
        light: "#a78bfa",
        dark: "#7c3aed",
      },
    },
  },
  shortcuts: {
    "btn": "px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer",
    "btn-primary": "btn bg-primary-500 text-white hover:bg-primary-600",
    "btn-secondary": "btn bg-gray-200 text-gray-800 hover:bg-gray-300",
    "btn-accent": "btn bg-accent text-white hover:bg-accent-dark",
    "card": "bg-white rounded-xl shadow-md p-6 border border-gray-100",
    "card-hover": "card hover:shadow-lg transition-shadow",
    "container": "max-w-4xl mx-auto px-4",
    "nav-link": "text-gray-600 hover:text-primary-600 transition-colors",
    "section": "py-12",
  },
});
