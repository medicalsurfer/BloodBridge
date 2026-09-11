import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedChatParticipant } from "@/src/lib/chat";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedChatParticipant(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const isDonor = authentication.user.role === "DONOR";

  const conversations = await prisma.conversation.findMany({
    where: isDonor
      ? { donorId: authentication.user.id }
      : { healthInstituteId: authentication.user.healthInstituteId! },
    orderBy: { updatedAt: "desc" },
    include: {
      donor: { select: { firstName: true, lastName: true, email: true } },
      healthInstitute: { select: { name: true, city: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: authentication.user.id } } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        donor: conversation.donor,
        healthInstitute: conversation.healthInstitute,
        updatedAt: conversation.updatedAt,
        lastMessage: conversation.messages[0] ?? null,
        unreadCount: conversation._count.messages,
      })),
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authentication = await getAuthenticatedChatParticipant(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  if (authentication.user.role !== "DONOR") {
    return NextResponse.json(
      { error: "Only donors can start a new conversation." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const healthInstituteId = String(body.healthInstituteId ?? "");

  if (!healthInstituteId) {
    return NextResponse.json(
      { error: "A health institute is required." },
      { status: 400 },
    );
  }

  const institute = await prisma.healthInstitute.findFirst({
    where: { id: healthInstituteId, status: "ACTIVE", isActive: true },
    select: { id: true, name: true, city: true },
  });

  if (!institute) {
    return NextResponse.json(
      { error: "That donation centre is not available." },
      { status: 400 },
    );
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      donorId_healthInstituteId: {
        donorId: authentication.user.id,
        healthInstituteId,
      },
    },
    create: {
      donorId: authentication.user.id,
      healthInstituteId,
    },
    update: {},
    include: {
      healthInstitute: { select: { name: true, city: true } },
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
