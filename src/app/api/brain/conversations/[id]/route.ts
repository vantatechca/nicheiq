import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.id), eq(conversations.userId, userId)))
    .limit(1);

  if (!conversation) return notFound("Conversation not found");

  const convMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.id))
    .orderBy(asc(messages.createdAt));

  return ok({ conversation, messages: convMessages });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  const db = getDb();
  // Cascade on the schema means messages are removed automatically.
  const [deleted] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, params.id), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });

  if (!deleted) return notFound("Conversation not found");
  return ok({ deleted: deleted.id });
}
