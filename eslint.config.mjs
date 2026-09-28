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
    // Prisma's generated client legitimately defines the raw-query helpers.
    "src/generated/**",
  ]),
  {
    // `jest.mock()` is hoisted above the imports in a file, so its factory
    // cannot close over an imported binding - the mock has to pull the
    // replacement in with require() at call time. That is the documented way
    // to write it, so the rule is relaxed for test files only.
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",

      /*
        `jest`, `describe`, `it` and `expect` are globals supplied by
        @types/jest. Importing the name `jest` rebinds it - `next/jest` in
        particular exports the config factory - and every jest.mock/fn/spyOn
        in the file then fails to type-check. It looks like a fix for a red
        squiggle and is the opposite of one, so it is an error here.
      */
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/jest",
              message:
                "next/jest belongs in jest.config.ts only. In a test, `jest` is a global from @types/jest - do not import it. If the globals show as undefined, restart the TypeScript server rather than adding an import.",
            },
            {
              name: "jest",
              message:
                "`jest` is a global from @types/jest - do not import it. If you want explicit imports instead, use `import { jest, describe, it, expect } from \"@jest/globals\"` consistently across the file.",
            },
          ],
        },
      ],
    },
  },
  {
    // SQL injection guard (SRS §9). Prisma's query API and its tagged-template
    // raw helpers always send values as bound parameters. The *Unsafe helpers
    // take a SQL string instead, which is the only way this codebase could
    // build a query out of user input - so they are banned outright.
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^\\$(queryRawUnsafe|executeRawUnsafe|runCommandRaw)$/]",
          message:
            "Raw SQL string APIs are not allowed: they can concatenate user input into a query. Use the Prisma query API, or $queryRaw`...` with ${} placeholders, which sends values as bound parameters.",
        },
      ],
    },
  },
]);

export default eslintConfig;
