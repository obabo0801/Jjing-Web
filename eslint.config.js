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
          blankLine: "never",
          prev: ["const", "let"],
          next: ["const", "let"]
        }
      ]
    }
  }
];
