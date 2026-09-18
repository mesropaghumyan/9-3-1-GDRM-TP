const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["*.js", "*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "writable",
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.jest.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-console": "warn",
    },
  },
  eslintConfigPrettier,
);
