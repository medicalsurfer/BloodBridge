import { redirect } from "next/navigation";

// Donor chat is shared by medical staff and institute admins, so it lives at
// /portal/chat now. This keeps older links and bookmarks working.
export default async function InstituteAdminChatRedirect({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const { conversationId } = await searchParams;

  redirect(conversationId ? `/portal/chat?conversationId=${conversationId}` : "/portal/chat");
}
