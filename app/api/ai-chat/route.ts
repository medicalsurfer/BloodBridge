import { NextRequest, NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/src/lib/rate-limit";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { buildUserContext, streamAssistantReply } from "@/src/lib/ai-chat";

const HISTORY_LIMIT = 30;
const MAX_MESSAGE_LENGTH = 2000;

// The most recent messages, oldest first.
async function recentMessages(userId: string) {
  const latest = await prisma.aiChatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return latest.reverse();
}

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  return NextResponse.json({ messages: await recentMessages(authentication.user.id) });
}

// Replies stream back as plain text; the assistant message is saved once the
// stream completes.
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

  if (!content) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  await prisma.aiChatMessage.create({ data: { userId, role: "USER", content } });

  const [history, userContext] = await Promise.all([recentMessages(userId), buildUserContext(userId)]);

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
        data: { userId, role: "ASSISTANT", content: result.value },
      });

      if (!clientGone) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  await prisma.aiChatMessage.deleteMany({ where: { userId: authentication.user.id } });

  return NextResponse.json({ ok: true });
}
