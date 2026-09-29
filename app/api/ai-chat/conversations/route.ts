import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth";

const LIST_LIMIT = 50;

/** The signed-in user's past assistant conversations, most recent first. */
export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: authentication.user.id },
    orderBy: { updatedAt: "desc" },
    take: LIST_LIMIT,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    conversations: conversations.map(({ _count, ...conversation }) => ({
      ...conversation,
      messageCount: _count.messages,
    })),
  });
}
