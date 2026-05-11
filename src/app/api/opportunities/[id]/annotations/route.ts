import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities, annotations } from "@/lib/db/schema";
import { ok, notFound, badRequest, created, unauthorized } from "@/lib/api/response";
import { annotationSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  // Verify opportunity exists first — 404 with a clear message.
  const [opp] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);
  if (!opp) return notFound("Opportunity not found");

  const rows = await db
    .select()
    .from(annotations)
    .where(eq(annotations.opportunityId, params.id))
    .orderBy(desc(annotations.createdAt));

  return ok({ annotations: rows });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = annotationSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();

  const [opp] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);
  if (!opp) return notFound("Opportunity not found");

  const [annotation] = await db
    .insert(annotations)
    .values({
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      opportunityId: params.id,
      userId,
      body: parsed.data.body,
    })
    .returning();

  return created({ annotation });
}