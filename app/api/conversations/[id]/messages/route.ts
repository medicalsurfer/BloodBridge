import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedChatParticipant } from "@/src/lib/chat";
import { notifyUser, notifyUsers } from "@/src/lib/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function loadConversationForParticipant(
  conversationId: string,
  user: { id: string; role: string; healthInstituteId: string | null },
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      donor: { select: { id: true, firstName: true, lastName: true } },
      healthInstitute: { select: { id: true, name: true } },
    },
  });

  if (!conversation) {
    return null;
  }

  const isOwnerDonor = user.role === "DONOR" && conversation.donorId === user.id;
  const isInstituteStaff =
    (user.role === "MEDICAL_STAFF" || user.role === "HEALTH_INSTITUTE_ADMIN") &&
    conversation.healthInstituteId === user.healthInstituteId;

  if (!isOwnerDonor && !isInstituteStaff) {
    return undefined;
  }

  return conversation;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authentication = await getAuthenticatedChatParticipant(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const { id } = await context.params;
  const conversation = await loadConversationForParticipant(id, authentication.user);

  if (conversation === null) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (conversation === undefined) {
    return NextResponse.json({ error: "You don't have access to this conversation." }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: authentication.user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(
    {
      conversation: {
        id: conversation.id,
        donor: conversation.donor,
        healthInstitute: conversation.healthInstitute,
      },
      messages,
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authentication = await getAuthenticatedChatParticipant(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const { id } = await context.params;
  const conversation = await loadConversationForParticipant(id, authentication.user);

  if (conversation === null) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (conversation === undefined) {
    return NextResponse.json({ error: "You don't have access to this conversation." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const text = String(body.body ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "A message body is required." }, { status: 400 });
  }

  if (text.length > 2000) {
    return NextResponse.json({ error: "Messages are limited to 2000 characters." }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: id,
        senderId: authentication.user.id,
        body: text,
      },
    }),
    prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    }),
  ]);

  if (authentication.user.role === "DONOR") {
    const staff = await prisma.user.findMany({
      where: {
        healthInstituteId: conversation.healthInstituteId,
        isActive: true,
        role: { in: ["MEDICAL_STAFF", "HEALTH_INSTITUTE_ADMIN"] },
      },
      select: { id: true },
    });

    await notifyUsers(
      staff.map((member) => member.id),
      {
        type: "CHAT",
        title: `New message from ${conversation.donor.firstName} ${conversation.donor.lastName}`,
        message: text.slice(0, 140),
        link: "/portal/institute-admin/chat",
      },
    );
  } else {
    await notifyUser({
      userId: conversation.donorId,
      type: "CHAT",
      title: `New message from ${conversation.healthInstitute.name}`,
      message: text.slice(0, 140),
      link: "/chat",
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
