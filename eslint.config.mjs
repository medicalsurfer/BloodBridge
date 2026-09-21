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
