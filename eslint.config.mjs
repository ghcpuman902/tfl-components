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
    "reference/**",
    // Local, untracked folders at the root (underscore prefix), e.g. nested worktrees.
    "_*/**",
    // Gitignored throwaway probes (.gitignore: scratch/), not app code.
    "scripts/scratch/**",
  ]),
]);

export default eslintConfig;
