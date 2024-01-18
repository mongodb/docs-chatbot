module.exports = {
  env: {
    node: true,
  },
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jest", "jsdoc", "prettier"],
  extends: ["eslint:recommended", "prettier"],
  ignorePatterns: ["build/*"],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": "warn",
    "arrow-body-style": "off",
    "prefer-arrow-callback": "off",
    "jsdoc/require-asterisk-prefix": ["error", "never"],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
  },
  overrides: [
    {
      files: ["test/**/*.ts", "*.test.ts"],
      env: {
        "jest/globals": true,
      },
    },
  ],
  settings: {
    jest: {
      version: 29,
    },
  },
};
