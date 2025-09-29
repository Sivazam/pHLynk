import parser from "@typescript-eslint/parser";
import plugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
      parser: parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": plugin,
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "warn",
    },
  },
];

export default eslintConfig;