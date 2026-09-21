import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedChatParticipant } from "@/src/lib/chat";
import { getActiveInstitute } from "@/src/lib/institutes";

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

  const body = await request.json().catch(() => ({}));

  if (authentication.user.role === "DONOR") {
    const healthInstituteId = String(body.healthInstituteId ?? "");

    if (!healthInstituteId) {
      return NextResponse.json(
        { error: "A health institute is required." },
        { status: 400 },
      );
    }

    const institute = await getActiveInstitute(String(healthInstituteId ?? ""));

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

  // Institute staff (medical staff / institute admin) start a conversation
  // with a specific donor, under their own institute.
  const donorId = String(body.donorId ?? "");

  if (!donorId) {
    return NextResponse.json(
      { error: "A donor is required." },
      { status: 400 },
    );
  }

  const healthInstituteId = authentication.user.healthInstituteId;

  if (!healthInstituteId) {
    return NextResponse.json(
      { error: "Chat is only available to institute staff." },
      { status: 403 },
    );
  }

  const donor = await prisma.user.findFirst({
    where: { id: donorId, role: "DONOR", isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!donor) {
    return NextResponse.json(
      { error: "That donor could not be found." },
      { status: 404 },
    );
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      donorId_healthInstituteId: {
        donorId,
        healthInstituteId,
      },
    },
    create: {
      donorId,
      healthInstituteId,
    },
    update: {},
    include: {
      donor: { select: { firstName: true, lastName: true, email: true } },
      healthInstitute: { select: { name: true, city: true } },
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
