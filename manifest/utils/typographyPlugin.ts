import plugin from "tailwindcss/plugin";

const typographyPlugin = plugin(function ({ addComponents }) {
  addComponents({
    ".app-h1": {
      "@apply font-inter text-app-h1 font-app-h1": {},
    },
    ".app-h2": {
      "@apply font-inter text-app-h2 font-app-h2": {},
    },
    ".app-h3": {
      "@apply font-inter text-app-h3 font-app-h3": {},
    },
    ".app-h4": {
      "@apply font-inter text-app-h4 font-app-h4": {},
    },
    ".app-body-lg": {
      "@apply font-inter text-app-body-lg font-app-body-lg": {},
    },
    ".app-body": {
      "@apply font-inter text-app-body font-app-body": {},
    },
    ".app-body-sm": {
      "@apply font-inter text-app-body-sm font-app-body-sm": {},
    },
    ".app-caption": {
      "@apply font-inter text-app-caption font-app-caption": {},
    },
  });
});

export default typographyPlugin;
