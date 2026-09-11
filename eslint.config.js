import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

const browser = ["\\#src/*", "\\#common/*", "\\#ui/*"];
const request = [
  "\\#router*",
  "\\#middleware/*",
  "\\#block",
  "\\#maint",
  "\\#page",
  "\\#assets",
  "\\#upload",
  "\\#error"
];

const backend = [
  "\\#config/*",
  "\\#build/*",
  "\\#db*",
  "\\#service/*",
  ...request,
  "node:*"
];

export default [
  { ignores: ["dist/**", "data/**", "node/**", ".codex*/**"] },
  {
    files: [
      "*.js",
      "config/**/*.js",
      "db/**/*.js",
      "service/**/*.js",
      "build/**/*.js",
      "middleware/**/*.js",
      "router/**/*.js"
    ],
    languageOptions: { globals: globals.node }
  },
  { files: ["src/js/**/*.js"], languageOptions: { globals: globals.browser } },
  {
    files: ["server.js", "middleware/**/*.js", "router/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...browser, "\\#build/*"] }
      ]
    }
  },
  {
    files: ["config/**/*.js", "db/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...browser, ...request, "\\#service/*", "\\#build/*"] }
      ]
    }
  },
  {
    files: ["service/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...browser, ...request, "\\#build/*"] }
      ]
    }
  },
  {
    files: ["build/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...browser, ...request, "\\#service/*", "\\#db*"] }
      ]
    }
  },
  {
    files: ["src/js/**/*.js"],
    rules: { "no-restricted-imports": ["error", { patterns: backend }] }
  },
  {
    files: ["src/js/common/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...backend, "\\#src/*", "\\#ui/*"] }
      ]
    }
  },
  {
    files: ["shared/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...backend, ...browser] }]
    }
  },
  {
    files: ["public/service-work.js"],
    languageOptions: { globals: globals.serviceworker }
  },
  {
    files: ["**/*.js"],
    plugins: { "@stylistic": stylistic },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-constant-binary-expression": "error",
      "no-unexpected-multiline": "error",
      "no-use-before-define": ["error", { functions: false }],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
        { blankLine: "always", prev: "let", next: "const" },
        { blankLine: "always", prev: "const", next: "let" },
        {
          blankLine: "always",
          prev: "multiline-expression",
          next: "multiline-expression"
        },
        {
          blankLine: "always",
          prev: "multiline-const",
          next: "multiline-const"
        }
      ]
    }
  }
];
