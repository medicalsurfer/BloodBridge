import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authentication = await getAuthenticatedUser(request);

    if (!authentication.user) {
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status },
      );
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: authentication.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({
        where: { userId: authentication.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json(
      { notifications, unreadCount },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("FETCH NOTIFICATIONS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to fetch notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authentication = await getAuthenticatedUser(request);

    if (!authentication.user) {
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status },
      );
    }

    const body = await request.json().catch(() => ({}));

    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: authentication.user.id, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({ message: "All notifications marked as read." });
    }

    return NextResponse.json(
      { error: "No valid notification change supplied." },
      { status: 400 },
    );
  } catch (error) {
    console.error("UPDATE NOTIFICATIONS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to update notifications." },
      { status: 500 },
    );
  }
}
