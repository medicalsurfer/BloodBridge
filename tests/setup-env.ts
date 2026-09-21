/*
  Environment for the test process.

  Two modules read the environment at import time and throw when it is
  missing: `src/lib/auth.ts` needs AUTH_SECRET to build its signing key, and
  `src/lib/prisma.ts` needs DATABASE_URL to construct the Postgres adapter.

  These values are fixtures, not credentials. No test opens a database
  connection — every suite that reaches Prisma mocks it (see
  tests/helpers/prisma-mock.ts) — but the URL still has to parse, and the
  session tests need a real secret to sign tokens the code under test can
  verify. Set here rather than in a .env file so a developer's live
  DATABASE_URL can never be picked up by a test run.
*/
process.env.AUTH_SECRET =
  process.env.TEST_AUTH_SECRET ?? "test-auth-secret-not-used-outside-jest";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/bloodbridge_test";

// NODE_ENV is left alone: jest already sets it to "test", and it is typed
// read-only, so assigning to it here would not type-check.
