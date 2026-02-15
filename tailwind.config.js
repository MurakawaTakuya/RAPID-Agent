const { heroui } = require("@heroui/theme");
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/components/(toast|spinner).js",
  ],
  theme: {
    extend: {},
  },
  plugins: [heroui()],
};
