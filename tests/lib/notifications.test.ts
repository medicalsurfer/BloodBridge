jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import { notifyUser, notifyUsers } from "@/src/lib/notifications";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";

/*
  In-app notifications. The contract that matters is the failure one: a
  notification must never take down the action that triggered it, so a
  database error has to come back as a null or a zero count rather than an
  exception the booking or donation handler would have to catch.
*/

let consoleError: jest.SpyInstance;

beforeEach(() => {
  resetPrismaMock();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("notifyUser", () => {
  it("creates one notification for the user", async () => {
    prisma.notification.create.mockResolvedValue({ id: "ntf_1" });

    await expect(
      notifyUser({
        userId: "usr_1",
        type: "APPOINTMENT",
        title: "Appointment booked",
        message: "See you on Monday.",
        link: "/appointments",
      }),
    ).resolves.toEqual({ id: "ntf_1" });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "usr_1",
        type: "APPOINTMENT",
        title: "Appointment booked",
        message: "See you on Monday.",
        link: "/appointments",
      },
    });
  });

  it("stores a null link when none is given", async () => {
    await notifyUser({ userId: "usr_1", type: "SYSTEM", title: "Hello", message: "Hi" });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ link: null }),
    });
  });

  it("returns null instead of throwing when the write fails", async () => {
    prisma.notification.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      notifyUser({ userId: "usr_1", type: "SYSTEM", title: "Hello", message: "Hi" }),
    ).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalled();
  });
});

describe("notifyUsers", () => {
  it("creates one notification per recipient", async () => {
    prisma.notification.createMany.mockResolvedValue({ count: 3 });

    await expect(
      notifyUsers(["usr_1", "usr_2", "usr_3"], {
        type: "BLOOD_REQUEST",
        title: "Urgent request",
        message: "O- needed in Nairobi.",
      }),
    ).resolves.toEqual({ count: 3 });

    const [[{ data }]] = prisma.notification.createMany.mock.calls as [
      [{ data: { userId: string; title: string }[] }],
    ];

    expect(data.map((row) => row.userId)).toEqual(["usr_1", "usr_2", "usr_3"]);
    expect(data.every((row) => row.title === "Urgent request")).toBe(true);
  });

  it("writes nothing for an empty recipient list", async () => {
    await expect(notifyUsers([], { type: "SYSTEM", title: "Hello", message: "Hi" })).resolves.toEqual(
      { count: 0 },
    );

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("caps the fan-out at 250 recipients by default", async () => {
    const everyone = Array.from({ length: 400 }, (_, index) => `usr_${index}`);

    await notifyUsers(everyone, { type: "BLOOD_REQUEST", title: "Urgent", message: "Needed" });

    const [[{ data }]] = prisma.notification.createMany.mock.calls as [[{ data: unknown[] }]];

    expect(data).toHaveLength(250);
  });

  it("honours a lower cap when one is given", async () => {
    const everyone = Array.from({ length: 100 }, (_, index) => `usr_${index}`);

    await notifyUsers(everyone, { type: "SYSTEM", title: "Hello", message: "Hi" }, 10);

    const [[{ data }]] = prisma.notification.createMany.mock.calls as [[{ data: unknown[] }]];

    expect(data).toHaveLength(10);
  });

  it("returns a zero count instead of throwing when the write fails", async () => {
    prisma.notification.createMany.mockRejectedValue(new Error("connection lost"));

    await expect(
      notifyUsers(["usr_1"], { type: "SYSTEM", title: "Hello", message: "Hi" }),
    ).resolves.toEqual({ count: 0 });

    expect(consoleError).toHaveBeenCalled();
  });
});
