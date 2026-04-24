// Flat ESLint config. We intentionally keep this minimal — the project relies
// primarily on TypeScript strict mode for correctness. Extending the Next/TS
// presets via @eslint/eslintrc is optional; uncomment the block below after
// running `pnpm add -D @eslint/eslintrc` if you want the full preset.

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
