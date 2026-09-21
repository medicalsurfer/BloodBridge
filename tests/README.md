# Tests

```bash
npm test                 # run everything
npm run test:watch       # re-run on change
npm run test:coverage    # with a coverage report
npx jest tests/api       # one folder
npx jest -t "8-week"     # tests whose name matches
```

No database, no SMTP server and no AI model need to be running. Nothing in the
suite opens a network connection or touches Postgres.

## How it is wired

`jest.config.ts` goes through `next/jest`, so test files use the same SWC
transform as `next dev` — TypeScript, JSX and the `@/*` alias all work with no
extra build step. Two things are set on top of it:

- **`moduleNameMapper` for `@/*`.** SWC rewrites the alias in real imports, but
  `jest.mock("@/src/lib/prisma")` is a plain string the transform never sees.
- **`transformIgnorePatterns`.** `jose` (session tokens) ships ESM only, so it
  is compiled through the same transform instead of requiring everyone to run
  node with `--experimental-vm-modules`.

`tests/setup-env.ts` supplies `AUTH_SECRET` and a `DATABASE_URL` that parses.
They are fixtures — no test connects — but both modules throw at import time
without them.

## Layout

| Path | What it covers |
|---|---|
| `tests/lib/` | Domain rules in `src/lib`: eligibility, blood compatibility, slots, input coercion, consultation entitlement, rate limiting, donation window, sessions and role guards, notifications, SMS normalisation |
| `tests/api/` | Route handlers: login, register, eligibility, appointments, blood requests |
| `tests/helpers/` | The Prisma mock and shared fixtures |

## Writing a new test

Mock the database, then use the fixtures for a signed-in request:

```ts
jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import { GET } from "@/app/api/donations/route";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";
import { makeAuthenticatedRequest, makeUser } from "../helpers/fixtures";

const donor = makeUser();

beforeEach(() => {
  resetPrismaMock();
  prisma.user.findUnique.mockResolvedValue(donor); // who the session resolves to
});

it("returns the donor's donations", async () => {
  prisma.donation.findMany.mockResolvedValue([{ id: "don_1" }]);

  const response = await GET(await makeAuthenticatedRequest(donor));

  expect(response.status).toBe(200);
});
```

Notes:

- `jest.mock` is hoisted above imports, so its factory must `require` rather
  than close over an import.
- Sessions are really signed and really verified; only the user lookup is
  mocked. `makeStaff("MEDICAL_STAFF")` and friends cover the other roles.
- `clearMocks` is on, which clears recorded calls but **not**
  implementations — call `resetPrismaMock()` in a `beforeEach`, and restore any
  `mockRejectedValue` you set on another module's mock.
- Anything that sends mail or SMS must be mocked in the test file, as
  `tests/api/appointments.test.ts` does.
- Rate limiting is a process-wide map, so give each test its own email and IP
  rather than resetting it.

## Not covered yet

The AI chat and recommendations (`src/lib/ai-chat.ts`, `ai-client.ts`,
`ai-recommendations.ts`), mail rendering (`src/lib/mail.ts`), password reset,
conversations, rewards, and the staff, lab-technician, institute-admin and
system-admin endpoints. React components are not covered either — that needs a
jsdom project alongside the node one in `jest.config.ts`, plus
`jest-environment-jsdom` and Testing Library.
