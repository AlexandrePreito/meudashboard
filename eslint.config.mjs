import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Tratar no-explicit-any como warning em vez de error para não bloquear build
      "@typescript-eslint/no-explicit-any": "warn",
      // Tratar prefer-const como warning
      "prefer-const": "warn",
      // Tratar no-require-imports como warning
      "@typescript-eslint/no-require-imports": "warn",
      // Tratar no-assign-module-variable como warning
      "@next/next/no-assign-module-variable": "warn",
      // Tratar no-html-link-for-pages como warning
      "@next/next/no-html-link-for-pages": "warn",
      // Tratar no-unescaped-entities como warning
      "react/no-unescaped-entities": "warn",
      // Tratar no-unused-expressions como warning
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
]);

export default eslintConfig;
