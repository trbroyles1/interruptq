import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    ".claude/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "specs/**",
    "drizzle/**",
    "drizzle-pg/**",
  ]),

  js.configs.recommended,

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // -- Disabled Next.js/React defaults (too restrictive for this codebase) --
      "react/display-name": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",

      // -- Core JavaScript best practices --
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      curly: ["error", "multi-line"],
      "no-console": "warn",
      "no-template-curly-in-string": "error",
      "object-shorthand": ["error", "always"],
      "prefer-arrow-callback": "error",
      "prefer-template": "error",

      // -- TypeScript best practices --
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
    },
  },

  // Scripts and CLI tools may use console
  {
    files: ["scripts/**/*.{js,mjs,cjs,ts}", "src/cli/**/*.ts"],
    rules: {
      "no-console": "off",
      "no-template-curly-in-string": "off",
    },
  },
]);

export default eslintConfig;
