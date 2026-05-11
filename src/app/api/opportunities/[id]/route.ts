import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { opportunityUpdateSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);

  if (!opp) return notFound("Opportunity not found");
  return ok({ opportunity: opp });
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
  const parsed = opportunityUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();

  // Build the update object from validated fields only — never let the client
  // smuggle through id, createdBy, createdAt, etc. Each enum gets cast since
  // Zod schema declares them as string() but the DB column is a pg enum.
  const updates: Partial<typeof opportunities.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.summary !== undefined) updates.summary = parsed.data.summary;
  if (parsed.data.niche !== undefined)
    updates.niche = parsed.data.niche as typeof opportunities.niche.enumValues[number];
  if (parsed.data.opportunityType !== undefined)
    updates.opportunityType =
      parsed.data.opportunityType as typeof opportunities.opportunityType.enumValues[number];
  if (parsed.data.buildEffort !== undefined)
    updates.buildEffort =
      parsed.data.buildEffort as typeof opportunities.buildEffort.enumValues[number];
  if (parsed.data.projectedRevenueUsd !== undefined)
    updates.projectedRevenueUsd = parsed.data.projectedRevenueUsd;
  if (parsed.data.status !== undefined)
    updates.status = parsed.data.status as typeof opportunities.status.enumValues[number];

  const [updated] = await db
    .update(opportunities)
    .set(updates)
    .where(eq(opportunities.id, params.id))
    .returning();

  if (!updated) return notFound("Opportunity not found");
  return ok({ opportunity: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const [deleted] = await db
    .delete(opportunities)
    .where(eq(opportunities.id, params.id))
    .returning({ id: opportunities.id });

  if (!deleted) return notFound("Opportunity not found");
  return ok({ deleted: deleted.id });
}