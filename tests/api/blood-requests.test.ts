jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import { GET } from "@/app/api/blood-requests/route";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";
import { makeAuthenticatedRequest, makeRequest, makeStaff, makeUser } from "../helpers/fixtures";

/*
  The donor's view of open blood requests (FR-15, FR-23): which requests this
  donor's own blood group can answer, with those listed first.

  The compatibility table itself is covered in
  tests/lib/blood-compatibility.test.ts; here it is about the endpoint using
  it - the donor's stored group, the sort, and what a donor with no recorded
  group is shown.
*/

const donor = makeUser();

function request(id: string, bloodGroup: string) {
  return {
    id,
    bloodGroup,
    status: "OPEN",
    urgency: "HIGH",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    healthInstitute: { id: "inst_1", name: "Nairobi Blood Bank", city: "Nairobi" },
  };
}

async function get(user = donor) {
  prisma.user.findUnique.mockResolvedValue(user);

  return GET(
    await makeAuthenticatedRequest(user, { url: "http://localhost/api/blood-requests" }),
  );
}

beforeEach(() => {
  resetPrismaMock();
});

describe("GET /api/blood-requests", () => {
  describe("access", () => {
    it("refuses an unauthenticated request with 401", async () => {
      const response = await GET(makeRequest({ url: "http://localhost/api/blood-requests" }));

      expect(response.status).toBe(401);
      expect(prisma.bloodRequest.findMany).not.toHaveBeenCalled();
    });

    it("refuses a staff account with 403", async () => {
      expect((await get(makeStaff("LAB_TECHNICIAN"))).status).toBe(403);
    });
  });

  describe("which requests are listed", () => {
    it("asks only for open requests at active institutes", async () => {
      await get();

      expect(prisma.bloodRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "OPEN",
            healthInstitute: { is: { status: "ACTIVE", isActive: true } },
          },
        }),
      );
    });

    it("asks the database for the most urgent and most recent first", async () => {
      await get();

      expect(prisma.bloodRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        }),
      );
    });

    it("returns an empty list when nothing is open", async () => {
      await expect((await get()).json()).resolves.toEqual({
        requests: [],
        donorBloodGroup: null,
      });
    });
  });

  describe("for a donor with a recorded blood group", () => {
    beforeEach(() => {
      prisma.donorProfile.findUnique.mockResolvedValue({ bloodGroup: "O_NEGATIVE" });
    });

    it("reports the donor's own group", async () => {
      await expect((await get()).json()).resolves.toMatchObject({
        donorBloodGroup: "O_NEGATIVE",
      });
    });

    it("flags each request the donor can answer", async () => {
      prisma.bloodRequest.findMany.mockResolvedValue([
        request("req_ab_pos", "AB_POSITIVE"),
        request("req_o_neg", "O_NEGATIVE"),
      ]);

      const { requests } = await (await get()).json();

      // O- is the universal donor, so both are answerable.
      expect(requests.map((item: { id: string; canDonate: boolean }) => item.canDonate)).toEqual([
        true,
        true,
      ]);
    });

    it("marks the requests the donor cannot answer", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue({ bloodGroup: "A_POSITIVE" });
      prisma.bloodRequest.findMany.mockResolvedValue([
        request("req_o_neg", "O_NEGATIVE"),
        request("req_b_pos", "B_POSITIVE"),
      ]);

      const { requests } = await (await get()).json();

      expect(requests.every((item: { canDonate: boolean }) => item.canDonate === false)).toBe(true);
    });

    it("lists the answerable requests first, whatever order they arrived in", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue({ bloodGroup: "A_POSITIVE" });
      prisma.bloodRequest.findMany.mockResolvedValue([
        request("req_b_neg", "B_NEGATIVE"),
        request("req_a_pos", "A_POSITIVE"),
        request("req_o_neg", "O_NEGATIVE"),
        request("req_ab_pos", "AB_POSITIVE"),
      ]);

      const { requests } = await (await get()).json();

      expect(requests.map((item: { id: string }) => item.id).slice(0, 2)).toEqual([
        "req_a_pos",
        "req_ab_pos",
      ]);
    });

    it("keeps the database's urgency order within the answerable group", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue({ bloodGroup: "O_NEGATIVE" });
      prisma.bloodRequest.findMany.mockResolvedValue([
        { ...request("req_critical", "A_POSITIVE"), urgency: "CRITICAL" },
        { ...request("req_low", "A_POSITIVE"), urgency: "LOW" },
      ]);

      const { requests } = await (await get()).json();

      expect(requests.map((item: { id: string }) => item.id)).toEqual(["req_critical", "req_low"]);
    });

    it("passes every request through, not just the matching ones", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue({ bloodGroup: "A_POSITIVE" });
      prisma.bloodRequest.findMany.mockResolvedValue([
        request("req_a_pos", "A_POSITIVE"),
        request("req_b_neg", "B_NEGATIVE"),
      ]);

      const { requests } = await (await get()).json();

      expect(requests).toHaveLength(2);
    });
  });

  describe("for a donor with no recorded blood group", () => {
    it("reports null rather than guessing", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue(null);
      prisma.bloodRequest.findMany.mockResolvedValue([request("req_a_pos", "A_POSITIVE")]);

      const { requests, donorBloodGroup } = await (await get()).json();

      expect(donorBloodGroup).toBeNull();
      // null, not false: "we don't know", not "you cannot help".
      expect(requests[0].canDonate).toBeNull();
    });

    it("treats a profile with a null group the same way", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue({ bloodGroup: null });
      prisma.bloodRequest.findMany.mockResolvedValue([request("req_a_pos", "A_POSITIVE")]);

      const { requests } = await (await get()).json();

      expect(requests[0].canDonate).toBeNull();
    });

    it("still lists every open request", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue(null);
      prisma.bloodRequest.findMany.mockResolvedValue([
        request("req_a_pos", "A_POSITIVE"),
        request("req_b_neg", "B_NEGATIVE"),
      ]);

      const { requests } = await (await get()).json();

      expect(requests).toHaveLength(2);
    });
  });
});
