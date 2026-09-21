jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

// Nothing may leave the machine during a test run: no SMTP connection, no SMS
// provider call. Both are asserted on instead, since a donor being told their
// appointment is confirmed is part of the behaviour under test.
jest.mock("@/src/lib/mail", () => ({
  sendAppointmentConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/src/lib/sms", () => ({
  sendSms: jest.fn().mockResolvedValue(0),
  smsEnabled: false,
  toE164: (phone: string | null) => phone,
}));

import { GET, POST } from "@/app/api/appointments/route";
import { SLOT_CAPACITY } from "@/src/lib/appointment-slots";
import { ELIGIBILITY_VALID_FOR_MS, MIN_DAYS_BETWEEN_DONATIONS } from "@/src/lib/eligibility";
import { sendAppointmentConfirmationEmail } from "@/src/lib/mail";
import { sendSms } from "@/src/lib/sms";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";
import { makeAuthenticatedRequest, makeRequest, makeStaff, makeUser } from "../helpers/fixtures";

/*
  Booking a donation appointment (FR-11) - the flow the SRS activity diagram
  describes, and the one place where several rules meet:

    1. the donor must be signed in, and be a donor;
    2. the date and time must be a real, bookable slot;
    3. the centre must be registered and active;
    4. a passed eligibility screening must exist and still be fresh;
    5. the 8-week interval must have elapsed by the appointment date;
    6. the donor may hold only one upcoming appointment;
    7. the slot must not already be full.

  Each gate gets a test that trips it, and one that proves a booking still
  goes through when it is satisfied.
*/

const donor = makeUser({ phoneNumber: "+254700000000" });
const INSTITUTE = {
  id: "inst_1",
  name: "Nairobi Blood Bank",
  city: "Nairobi",
  region: "Nairobi",
  address: "1 Hospital Road",
  email: "centre@gmail.com",
  phoneNumber: "+254711111111",
};

/** A bookable date: tomorrow, as YYYY-MM-DD. */
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function booking(overrides: Record<string, unknown> = {}) {
  return {
    healthInstituteId: INSTITUTE.id,
    appointmentDate: tomorrow(),
    appointmentTime: "10:00",
    ...overrides,
  };
}

async function post(body: unknown, user = donor) {
  prisma.user.findUnique.mockResolvedValue(user);

  return POST(
    await makeAuthenticatedRequest(user, {
      url: "http://localhost/api/appointments",
      method: "POST",
      body,
    }),
  );
}

beforeEach(() => {
  resetPrismaMock();

  // `clearMocks` clears recorded calls but leaves implementations in place, so
  // the one test that makes the mailer throw would otherwise keep throwing in
  // every test after it.
  (sendAppointmentConfirmationEmail as jest.Mock).mockResolvedValue(undefined);
  (sendSms as jest.Mock).mockResolvedValue(0);

  // The happy path: an active centre, a screening passed an hour ago, no
  // previous donation, an empty slot, and a create that echoes the booking.
  prisma.healthInstitute.findFirst.mockResolvedValue(INSTITUTE);
  prisma.eligibilityAssessment.findFirst.mockResolvedValue({
    eligible: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  });
  prisma.appointment.findFirst.mockResolvedValue(null);
  prisma.appointment.count.mockResolvedValue(0);
  prisma.appointment.create.mockImplementation(async ({ data }: never) => ({
    id: "apt_1",
    ...(data as object),
    healthInstitute: INSTITUTE,
  }));
});

describe("POST /api/appointments", () => {
  describe("a booking that satisfies every rule", () => {
    it("is created with status SCHEDULED and returns 201", async () => {
      const response = await post(booking());

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toMatchObject({
        message: "Appointment booked successfully.",
        appointment: { healthInstituteId: INSTITUTE.id, appointmentTime: "10:00" },
      });
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ donorId: donor.id, status: "SCHEDULED" }),
        }),
      );
    });

    it("notifies the donor in the app", async () => {
      await post(booking());

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: donor.id,
          type: "APPOINTMENT",
          title: "Appointment booked",
        }),
      });
    });

    it("emails and texts the confirmation", async () => {
      await post(booking());

      expect(sendAppointmentConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: donor.email, instituteName: INSTITUTE.name }),
      );
      expect(sendSms).toHaveBeenCalledWith(
        [donor.phoneNumber],
        expect.stringContaining(INSTITUTE.name),
      );
    });

    it("writes the booking to the audit trail", async () => {
      await post(booking());

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "APPOINTMENT_BOOKED", actorId: donor.id }),
      });
    });

    it("still books when the confirmation email fails", async () => {
      (sendAppointmentConfirmationEmail as jest.Mock).mockRejectedValue(new Error("SMTP down"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const response = await post(booking());

      expect(response.status).toBe(201);
      consoleError.mockRestore();
    });

    it("bounds the notes field rather than storing whatever was sent", async () => {
      await post(booking({ notes: "x".repeat(5000) }));

      const [[{ data }]] = prisma.appointment.create.mock.calls as [[{ data: { notes: string } }]];

      expect(data.notes).toHaveLength(1000);
    });

    it("stores no notes at all when the field is blank", async () => {
      await post(booking({ notes: "   " }));

      const [[{ data }]] = prisma.appointment.create.mock.calls as [
        [{ data: { notes: string | null } }],
      ];

      expect(data.notes).toBeNull();
    });
  });

  describe("gate 1: who is asking", () => {
    it("refuses an unauthenticated request with 401", async () => {
      const response = await POST(
        makeRequest({
          url: "http://localhost/api/appointments",
          method: "POST",
          body: booking(),
        }),
      );

      expect(response.status).toBe(401);
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it("refuses a staff account with 403", async () => {
      const response = await post(booking(), makeStaff("MEDICAL_STAFF"));

      expect(response.status).toBe(403);
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  describe("gate 2: the requested slot", () => {
    it.each([
      ["healthInstituteId", "Health institute is required."],
      ["appointmentDate", "Appointment date is required."],
      ["appointmentTime", "Appointment time is required."],
    ])("rejects a booking with no %s", async (field, error) => {
      const body = booking();
      delete (body as Record<string, unknown>)[field];

      const response = await post(body);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error });
    });

    it("rejects a date in the past", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await post(
        booking({ appointmentDate: yesterday.toISOString().slice(0, 10) }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Appointments can't be booked in the past.",
      });
    });

    it("rejects a time outside the published slots", async () => {
      const response = await post(booking({ appointmentTime: "03:00" }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Choose one of the available appointment times.",
      });
    });

    it("checks the slot before it touches the database", async () => {
      await post(booking({ appointmentTime: "03:00" }));

      expect(prisma.healthInstitute.findFirst).not.toHaveBeenCalled();
      expect(prisma.eligibilityAssessment.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("gate 3: the centre", () => {
    it("rejects a centre that is not registered and active", async () => {
      prisma.healthInstitute.findFirst.mockResolvedValue(null);

      const response = await post(booking());

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "The selected donation centre is not available.",
      });
    });

    it("only ever looks for an active centre", async () => {
      await post(booking());

      expect(prisma.healthInstitute.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INSTITUTE.id, status: "ACTIVE", isActive: true },
        }),
      );
    });
  });

  describe("gate 4: the eligibility screening", () => {
    it("refuses a donor who has never been screened", async () => {
      prisma.eligibilityAssessment.findFirst.mockResolvedValue(null);

      const response = await post(booking());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ eligibilityRequired: true });
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it("refuses a donor whose last screening deferred them", async () => {
      prisma.eligibilityAssessment.findFirst.mockResolvedValue({
        eligible: false,
        createdAt: new Date(),
      });

      const response = await post(booking());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ eligibilityRequired: true });
    });

    it("refuses a screening that has expired, and says so", async () => {
      prisma.eligibilityAssessment.findFirst.mockResolvedValue({
        eligible: true,
        createdAt: new Date(Date.now() - ELIGIBILITY_VALID_FOR_MS - 1000),
      });

      const response = await post(booking());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        eligibilityRequired: true,
        eligibilityExpired: true,
      });
    });

    it("reads the donor's most recent screening", async () => {
      await post(booking());

      expect(prisma.eligibilityAssessment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { donorId: donor.id },
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });

  describe("gate 5: the 8-week interval", () => {
    it("refuses an appointment inside the interval", async () => {
      prisma.donation.findFirst.mockResolvedValue({ donatedAt: daysAgo(5) });

      const response = await post(booking());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: expect.stringContaining(`wait ${MIN_DAYS_BETWEEN_DONATIONS} days`),
      });
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it("tells the donor the date they can book from", async () => {
      prisma.donation.findFirst.mockResolvedValue({ donatedAt: daysAgo(5) });

      const body = await (await post(booking())).json();

      expect(new Date(body.earliestNextDonation).getTime()).toBeGreaterThan(Date.now());
    });

    it("allows a booking for a date after the interval ends", async () => {
      prisma.donation.findFirst.mockResolvedValue({ donatedAt: daysAgo(55) });

      const inTwoDays = new Date();
      inTwoDays.setDate(inTwoDays.getDate() + 2);

      const response = await post(
        booking({ appointmentDate: inTwoDays.toISOString().slice(0, 10) }),
      );

      expect(response.status).toBe(201);
    });

    it("allows a booking once the interval has passed entirely", async () => {
      prisma.donation.findFirst.mockResolvedValue({
        donatedAt: daysAgo(MIN_DAYS_BETWEEN_DONATIONS + 1),
      });

      expect((await post(booking())).status).toBe(201);
    });
  });

  describe("gate 6: one upcoming appointment at a time", () => {
    it("refuses a second booking with 409", async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: "apt_existing" });

      const response = await post(booking());

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        error:
          "You already have an upcoming appointment. Reschedule or cancel it before booking another.",
      });
    });

    it("only counts appointments that are still live", async () => {
      await post(booking());

      expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            donorId: donor.id,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
          }),
        }),
      );
    });
  });

  describe("gate 7: slot capacity", () => {
    it(`refuses the booking once ${SLOT_CAPACITY} donors hold the slot`, async () => {
      prisma.appointment.count.mockResolvedValue(SLOT_CAPACITY);

      const response = await post(booking());

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        error: "That time slot is full at this centre. Please choose another time.",
      });
    });

    it("allows the last free place in the slot", async () => {
      prisma.appointment.count.mockResolvedValue(SLOT_CAPACITY - 1);

      expect((await post(booking())).status).toBe(201);
    });

    it("counts only live appointments for that centre, date and time", async () => {
      await post(booking());

      expect(prisma.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          healthInstituteId: INSTITUTE.id,
          appointmentTime: "10:00",
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        }),
      });
    });
  });

  it("returns 500 rather than leaking an internal error", async () => {
    prisma.appointment.create.mockRejectedValue(new Error("deadlock detected"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await post(booking());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to book appointment." });
    consoleError.mockRestore();
  });
});

describe("GET /api/appointments", () => {
  it("refuses an unauthenticated request with 401", async () => {
    const response = await GET(makeRequest({ url: "http://localhost/api/appointments" }));

    expect(response.status).toBe(401);
  });

  it("returns only the signed-in donor's appointments, soonest first", async () => {
    prisma.appointment.findMany.mockResolvedValue([{ id: "apt_1" }]);
    prisma.user.findUnique.mockResolvedValue(donor);

    const response = await GET(
      await makeAuthenticatedRequest(donor, { url: "http://localhost/api/appointments" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ appointments: [{ id: "apt_1" }] });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { donorId: donor.id },
        orderBy: { appointmentDate: "asc" },
      }),
    );
  });
});
