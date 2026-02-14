import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["node_modules/", ".next/", "out/", "public/", "dist/"],
  },
];

export default eslintConfig;
