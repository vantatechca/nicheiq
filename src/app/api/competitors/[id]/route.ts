import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { competitors } from "@/lib/db/schema";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

const updateSchema = z.object({
  depth: z.enum(["light", "deep"]).optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [competitor] = await db
    .select()
    .from(competitors)
    .where(eq(competitors.id, params.id))
    .limit(1);
  if (!competitor) return notFound("Competitor not found");
  return ok({ competitor });
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const updates: Partial<typeof competitors.$inferInsert> = {};
  if (parsed.data.depth !== undefined) updates.depth = parsed.data.depth;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [updated] = await db
    .update(competitors)
    .set(updates)
    .where(eq(competitors.id, params.id))
    .returning();

  if (!updated) return notFound("Competitor not found");
  return ok({ competitor: updated });
}
