const js = require("@eslint/js");
const prettier = require("eslint-config-prettier/flat");

module.exports = [
  {
    ignores: ["node_modules/**", "public/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        console: "readonly",
      },
    },
  },
  prettier,
];
