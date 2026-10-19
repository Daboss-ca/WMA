/**
 * Tailwind theme defaults for utility classes if/when Tailwind is enabled.
 * The current application is styled with native CSS and does not run a
 * Tailwind/PostCSS build step.
 */
export default {
  content: ["./index.html", "./admin.html", "./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
};
