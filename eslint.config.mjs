import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    ".wrangler-config/**",
    ".npm-cache/**",
    ".gh-cache/**",
    "src/generated/**",
    "node_modules/**",
    "coverage/**",
  ]),
]);
