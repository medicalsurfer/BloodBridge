import { NextRequest, NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { buildUserContext, streamAssistantReply } from "@/src/lib/ai-chat";

const HISTORY_LIMIT = 30;
const MAX_MESSAGE_LENGTH = 2000;
const TITLE_LENGTH = 60;

/** A title from the opening question, cut at a word where it can be. */
function titleFrom(content: string) {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= TITLE_LENGTH) return flat;
  const cut = flat.slice(0, TITLE_LENGTH);
  const space = cut.lastIndexOf(" ");
  return `${space > 30 ? cut.slice(0, space) : cut}…`;
}

/**
 * The conversation with this id, only if it belongs to this user. Every
 * lookup goes through here, so one user can never read another's chat by
 * guessing an id.
 */
function ownConversation(userId: string, id: string) {
  return prisma.aiConversation.findFirst({ where: { id, userId }, select: { id: true, title: true } });
}

// The most recent messages of one conversation, oldest first.
async function recentMessages(conversationId: string) {
  const latest = await prisma.aiChatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return latest.reverse();
}

/**
 * GET ?conversationId=… returns that conversation. Without an id it returns
 * the user's most recent one, or none, so the panel reopens where they were.
 */
export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const userId = authentication.user.id;
  const requested = request.nextUrl.searchParams.get("conversationId");

  const conversation = requested
    ? await ownConversation(userId, requested)
    : await prisma.aiConversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true },
      });

  if (requested && !conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({
    conversation,
    messages: conversation ? await recentMessages(conversation.id) : [],
  });
}

/*
  Replies stream back as plain text; the assistant message is saved once the
  stream completes. Without a conversationId a new conversation is started,
  and its id comes back in the X-Conversation-Id header (the body is the
  stream, so it cannot carry it).
*/
export async function POST(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const userId = authentication.user.id;

  const limited = rateLimit(`ai-chat:${userId}`, LIMITS.aiChat.limit, LIMITS.aiChat.windowMs);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const content = typeof body.message === "string" ? body.message.trim() : "";
  const requested = typeof body.conversationId === "string" ? body.conversationId : "";

  if (!content) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  let conversationId: string;

  if (requested) {
    const conversation = await ownConversation(userId, requested);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    conversationId = conversation.id;
  } else {
    const created = await prisma.aiConversation.create({
      data: { userId, title: titleFrom(content) },
      select: { id: true },
    });
    conversationId = created.id;
  }

  await prisma.$transaction([
    prisma.aiChatMessage.create({ data: { userId, conversationId, role: "USER", content } }),
    // Moves it to the top of the user's list.
    prisma.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);

  const [history, userContext] = await Promise.all([
    recentMessages(conversationId),
    buildUserContext(userId),
  ]);

  // The API requires the conversation to start with a user turn.
  const firstUserTurn = history.findIndex((message) => message.role === "USER");
  const turns = history
    .slice(firstUserTurn)
    .map((message) => ({ role: message.role, content: message.content }));

  const encoder = new TextEncoder();
  const reply = streamAssistantReply(turns, userContext);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let clientGone = false;
      let result = await reply.next();

      while (!result.done) {
        if (!clientGone) {
          try {
            controller.enqueue(encoder.encode(result.value));
          } catch {
            // The browser closed the panel; finish generating so the reply is still saved.
            clientGone = true;
          }
        }
        result = await reply.next();
      }

      await prisma.aiChatMessage.create({
        data: { userId, conversationId, role: "ASSISTANT", content: result.value },
      });

      if (!clientGone) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": conversationId,
    },
  });
}

/** DELETE ?conversationId=… deletes that one conversation. */
export async function DELETE(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const requested = request.nextUrl.searchParams.get("conversationId") ?? "";
  const deleted = await prisma.aiConversation.deleteMany({
    where: { id: requested, userId: authentication.user.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
