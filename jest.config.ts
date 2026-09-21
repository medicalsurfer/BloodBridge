import type { Config } from "jest";
import nextJest from "next/jest.js";

/*
  Jest is wired through `next/jest` so test files go through the same SWC
  transform (TypeScript, JSX, the `@/*` path alias) that `next dev` uses.
  No separate babel or ts-jest configuration is needed.

  Everything under test here is server-side: domain rules in `src/lib` and the
  route handlers in `app/api`. They run in the `node` environment, which is
  what Next uses for route handlers too. A jsdom project can be added later
  for React component tests without touching this one.
*/
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  /*
    The `@/*` alias from tsconfig is rewritten by SWC for real imports, but
    `jest.mock("@/src/lib/prisma")` takes a plain string that the transform
    never sees. Mapping it here so a mocked path resolves the same way an
    imported one does.
  */
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "app/api/**/*.ts",
    "!src/lib/prisma.ts",
    "!src/generated/**",
  ],
};

/*
  `jose` (session tokens) ships as ESM only. Jest can require ESM natively,
  but only when node is started with --experimental-vm-modules, which would
  mean nobody could run a bare `jest`. Compiling it to CommonJS through the
  same SWC transform instead keeps `npm test` a plain `jest` invocation.

  next/jest appends any transformIgnorePatterns given above to its own, and a
  file is ignored when it matches *any* pattern - so the list has to be
  replaced after the fact rather than added to.
*/
const ESM_DEPENDENCIES = ["jose"];

const jestConfig = async () => {
  const resolved = await createJestConfig(config)();

  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!(${ESM_DEPENDENCIES.join("|")})/)`,
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};

export default jestConfig;
