-- Assistant chats become separate conversations a user can reopen.
-- Existing messages are kept: each user's history becomes their first
-- conversation, titled from its first question.

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- AlterTable: nullable first, so existing rows can be assigned below.
ALTER TABLE "ai_chat_messages" ADD COLUMN "conversationId" TEXT;

-- Backfill: one conversation per user who already has messages.
INSERT INTO "ai_conversations" ("id", "userId", "title", "createdAt", "updatedAt")
SELECT
    'legacy_' || m."userId",
    m."userId",
    COALESCE(
        (
            SELECT LEFT(first_q."content", 60)
            FROM "ai_chat_messages" first_q
            WHERE first_q."userId" = m."userId" AND first_q."role" = 'USER'
            ORDER BY first_q."createdAt" ASC
            LIMIT 1
        ),
        'Conversation'
    ),
    MIN(m."createdAt"),
    MAX(m."createdAt")
FROM "ai_chat_messages" m
GROUP BY m."userId";

UPDATE "ai_chat_messages" SET "conversationId" = 'legacy_' || "userId";

ALTER TABLE "ai_chat_messages" ALTER COLUMN "conversationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ai_conversations_userId_updatedAt_idx" ON "ai_conversations"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ai_chat_messages_conversationId_createdAt_idx" ON "ai_chat_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
