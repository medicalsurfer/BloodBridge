import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  try {
    const { id } = await context.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: authentication.user.id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error("UPDATE NOTIFICATION ERROR:", error);
    return NextResponse.json(
      { error: "Unable to update notification." },
      { status: 500 },
    );
  }
}
