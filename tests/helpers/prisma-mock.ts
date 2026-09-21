/*
  A stand-in for src/lib/prisma.ts.

  Route handlers and the lib modules they call reach the database through that
  one module, so replacing it is enough to run them without Postgres. Each
  model gets the same set of jest.fn() delegates the real client exposes, and
  the named query helpers (getUserByEmail and friends) are mocked too.

  Every delegate resolves to null / [] / 0 by default, so a test only has to
  say what it cares about. `jest.config.ts` sets `clearMocks`, which resets
  the calls and the implementations between tests - call `resetPrismaMock()`
  in a beforeEach to put the defaults back afterwards.

  Usage, at the top of a suite:

      jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);
*/

type Delegate = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
};

const MODELS = [
  "user",
  "passwordResetToken",
  "aiChatMessage",
  "notification",
  "donationReward",
  "auditLog",
  "conversation",
  "message",
  "eligibilityAssessment",
  "donorProfile",
  "healthInstitute",
  "appointment",
  "bloodRequest",
  "donation",
  "bloodInventory",
] as const;

type ModelName = (typeof MODELS)[number];

function delegate(): Delegate {
  return {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(null),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(null),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
  };
}

export type PrismaMock = Record<ModelName, Delegate> & {
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
};

function buildClient(): PrismaMock {
  const client = {
    // A transaction of promises resolves them together, like the real client;
    // a callback form receives the same mock client.
    $transaction: jest.fn(async (operations: unknown) =>
      typeof operations === "function"
        ? (operations as (tx: PrismaMock) => unknown)(prisma)
        : Promise.all(operations as Promise<unknown>[]),
    ),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0),
  } as PrismaMock;

  for (const model of MODELS) {
    client[model] = delegate();
  }

  return client;
}

export const prisma = buildClient();

/** The named query helpers src/lib/prisma.ts exports alongside the client. */
export const helpers = {
  createUser: jest.fn().mockResolvedValue(null),
  getUserByEmail: jest.fn().mockResolvedValue(null),
  getUserById: jest.fn().mockResolvedValue(null),
  getTotalUsers: jest.fn().mockResolvedValue(0),
  createHealthInstitute: jest.fn().mockResolvedValue(null),
  getHealthInstitutes: jest.fn().mockResolvedValue([]),
  getHealthInstituteById: jest.fn().mockResolvedValue(null),
  getHealthInstituteByNameAndCity: jest.fn().mockResolvedValue(null),
  getTotalHealthInstitutes: jest.fn().mockResolvedValue(0),
  getActiveHealthInstitutesCount: jest.fn().mockResolvedValue(0),
  getPendingHealthInstitutesCount: jest.fn().mockResolvedValue(0),
  getRecentHealthInstitutes: jest.fn().mockResolvedValue([]),
  updateHealthInstituteStatus: jest.fn().mockResolvedValue(null),
  deleteHealthInstitute: jest.fn().mockResolvedValue(null),
};

/** What `jest.mock("@/src/lib/prisma", ...)` should return. */
export const prismaMockModule = { prisma, ...helpers };

/**
 * Restores the "found nothing" defaults that `clearMocks` wipes between
 * tests. Call from a beforeEach in any suite that uses this mock.
 */
export function resetPrismaMock() {
  for (const model of MODELS) {
    const fresh = delegate();
    for (const [method, implementation] of Object.entries(fresh)) {
      const existing = prisma[model][method as keyof Delegate];
      existing.mockImplementation(implementation.getMockImplementation()!);
    }
  }

  prisma.$transaction.mockImplementation(async (operations: unknown) =>
    typeof operations === "function"
      ? (operations as (tx: PrismaMock) => unknown)(prisma)
      : Promise.all(operations as Promise<unknown>[]),
  );
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.$executeRaw.mockResolvedValue(0);

  helpers.getUserByEmail.mockResolvedValue(null);
  helpers.getUserById.mockResolvedValue(null);
  helpers.createUser.mockResolvedValue(null);
  helpers.getHealthInstitutes.mockResolvedValue([]);
  helpers.getHealthInstituteById.mockResolvedValue(null);
  helpers.getHealthInstituteByNameAndCity.mockResolvedValue(null);
  helpers.getRecentHealthInstitutes.mockResolvedValue([]);
  helpers.getTotalUsers.mockResolvedValue(0);
  helpers.getTotalHealthInstitutes.mockResolvedValue(0);
  helpers.getActiveHealthInstitutesCount.mockResolvedValue(0);
  helpers.getPendingHealthInstitutesCount.mockResolvedValue(0);
}
