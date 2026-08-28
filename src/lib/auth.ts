import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET is not defined in the environment variables.");
}

const secret = new TextEncoder().encode(authSecret);

type AuthenticatedUser = Awaited<ReturnType<typeof getUser>>;

async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("bloodbridge_session")?.value;

  if (!token) {
    return { user: null, status: 401, error: "Not authenticated." } as const;
  }

  return getAuthenticatedUserFromToken(token);
}

export async function getAuthenticatedUserFromToken(token: string) {

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId;

    if (!userId || typeof userId !== "string") {
      return { user: null, status: 401, error: "Invalid session." } as const;
    }

    const user = await getUser(userId);

    if (!user) {
      return { user: null, status: 404, error: "User not found." } as const;
    }

    if (!user.isActive) {
      return { user: null, status: 403, error: "This account is inactive." } as const;
    }

    return { user, status: 200, error: null } as const;
  } catch {
    return {
      user: null,
      status: 401,
      error: "Invalid or expired session.",
    } as const;
  }
}

export async function getAuthenticatedDonor(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return authentication;
  }

  if (authentication.user.role !== "DONOR") {
    return {
      user: null,
      status: 403,
      error: "This account is not a donor account.",
    } as const;
  }

  return authentication as {
    user: NonNullable<AuthenticatedUser>;
    status: 200;
    error: null;
  };
}
