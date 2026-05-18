import { NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

const newConvSchema = z.object({
  brainMode: z.enum([
    "global",
    "niche",
    "opportunity",
    "creator",
    "build_plan",
    "replicate",
    "dataset_review",
  ]),
  contextRefs: z.record(z.unknown()).optional(),
  title: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  const db = getDb();

  // Aggregate messageCount with a LEFT JOIN + GROUP BY so the sidebar can
  // render "N messages" without N additional round trips. LEFT JOIN keeps
  // brand-new (empty) conversations in the list with count = 0.
  // Previously this endpoint returned conversations without a messageCount
  // field at all, and the UI rendered "undefined messages" for every row.
  const rows = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      brainMode: conversations.brainMode,
      contextRefs: conversations.contextRefs,
      title: conversations.title,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      messageCount: sql<number>`COUNT(${messages.id})::int`.as("message_count"),
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.userId, userId))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.lastMessageAt));

  return ok({ conversations: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = newConvSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const [conversation] = await db
    .insert(conversations)
    .values({
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      brainMode: parsed.data.brainMode,
      contextRefs: parsed.data.contextRefs ?? {},
      title: parsed.data.title ?? "New conversation",
    })
    .returning();

  // Match the GET shape so the client can drop the new row straight into
  // its sorted list without a refetch. New conversations always start at
  // 0 messages.
  return created({ conversation: { ...conversation, messageCount: 0 } });
}
