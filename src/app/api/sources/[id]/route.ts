import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { sourceUpdateSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [source] = await db.select().from(sources).where(eq(sources.id, params.id)).limit(1);
  if (!source) return notFound("Source not found");
  return ok({ source });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = sourceUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const updates: Partial<typeof sources.$inferInsert> = {};
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;
  if (parsed.data.cronSchedule !== undefined) updates.cronSchedule = parsed.data.cronSchedule;
  if (parsed.data.config !== undefined) updates.config = parsed.data.config;

  const [updated] = await db
    .update(sources)
    .set(updates)
    .where(eq(sources.id, params.id))
    .returning();

  if (!updated) return notFound("Source not found");
  return ok({ source: updated });
}
