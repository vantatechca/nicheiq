import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { goldenRules } from "@/lib/db/schema";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/response";
import { ruleSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [rule] = await db.select().from(goldenRules).where(eq(goldenRules.id, params.id)).limit(1);
  if (!rule) return notFound("Rule not found");
  return ok({ rule });
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
  const parsed = ruleSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const updates: Partial<typeof goldenRules.$inferInsert> = {};
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.ruleType !== undefined) updates.ruleType = parsed.data.ruleType;
  if (parsed.data.niche !== undefined)
    updates.niche = parsed.data.niche
      ? (parsed.data.niche as (typeof goldenRules.niche.enumValues)[number])
      : null;
  if (parsed.data.keywords !== undefined) updates.keywords = parsed.data.keywords;
  if (parsed.data.weight !== undefined) updates.weight = parsed.data.weight;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const [updated] = await db
    .update(goldenRules)
    .set(updates)
    .where(eq(goldenRules.id, params.id))
    .returning();

  if (!updated) return notFound("Rule not found");
  return ok({ rule: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [deleted] = await db
    .delete(goldenRules)
    .where(eq(goldenRules.id, params.id))
    .returning({ id: goldenRules.id });

  if (!deleted) return notFound("Rule not found");
  return ok({ deleted: deleted.id });
}
