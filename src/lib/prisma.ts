import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

declare global {
  var prismaClient: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaClient ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}

/*
|--------------------------------------------------------------------------
| USER FUNCTIONS
|--------------------------------------------------------------------------
*/

export async function createUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string | null;
}) {
  return prisma.user.create({
    data,
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
}

export async function getTotalUsers() {
  return prisma.user.count();
}

/*
|--------------------------------------------------------------------------
| HEALTH INSTITUTE FUNCTIONS
|--------------------------------------------------------------------------
*/

export async function createHealthInstitute(data: {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city: string;
  region?: string | null;
}) {
  return prisma.healthInstitute.create({
    data: {
      name: data.name,
      email: data.email ?? null,
      phoneNumber: data.phoneNumber ?? null,
      address: data.address ?? null,
      city: data.city,
      region: data.region ?? null,
      status: "ACTIVE",
      isActive: true,
    },
  });
}

export async function getHealthInstitutes() {
  return prisma.healthInstitute.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getHealthInstituteById(id: string) {
  return prisma.healthInstitute.findUnique({
    where: {
      id,
    },
  });
}

export async function getHealthInstituteByNameAndCity(
  name: string,
  city: string,
) {
  return prisma.healthInstitute.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },

      city: {
        equals: city,
        mode: "insensitive",
      },
    },
  });
}

export async function getTotalHealthInstitutes() {
  return prisma.healthInstitute.count();
}

export async function getActiveHealthInstitutesCount() {
  return prisma.healthInstitute.count({
    where: {
      status: "ACTIVE",
    },
  });
}

export async function getPendingHealthInstitutesCount() {
  return prisma.healthInstitute.count({
    where: {
      status: "PENDING",
    },
  });
}

export async function getRecentHealthInstitutes(limit = 5) {
  return prisma.healthInstitute.findMany({
    orderBy: {
      createdAt: "desc",
    },

    take: limit,
  });
}

export async function updateHealthInstituteStatus(
  id: string,
  status: "ACTIVE" | "PENDING" | "INACTIVE",
) {
  return prisma.healthInstitute.update({
    where: {
      id,
    },

    data: {
      status,
      isActive: status === "ACTIVE",
    },
  });
}

export async function deleteHealthInstitute(id: string) {
  return prisma.healthInstitute.delete({
    where: {
      id,
    },
  });
}