/**
 * UnoCSS Configuration
 * @see https://unocss.dev/guide/config-file
 */
import { presetUno } from "unocss";

export default {
  presets: [
    presetUno(),
  ],

  // Custom theme colors, spacing, etc.
  theme: {
    colors: {
      primary: "#0070f3",
      secondary: "#666",
    },
  },

  // Custom shortcuts for common patterns
  shortcuts: {
    "btn": "px-4 py-2 rounded bg-primary text-white hover:opacity-80 cursor-pointer",
    "container": "max-w-800px mx-auto px-4",
  },

  // Additional rules (optional)
  rules: [],

  // Safelist classes that should always be generated
  safelist: [],
};
