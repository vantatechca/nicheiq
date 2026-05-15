import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
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
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
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

  return created({ conversation });
}
