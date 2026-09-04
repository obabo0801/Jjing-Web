import stylistic from "@stylistic/eslint-plugin";

export default [
  { ignores: ["dist/**"] },
  {
    files: ["**/*.js"],
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: ["const", "let"],
          next: "*"
        },
        {
          blankLine: "any",
          prev: ["const", "let"],
          next: ["const", "let"]
        },
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
