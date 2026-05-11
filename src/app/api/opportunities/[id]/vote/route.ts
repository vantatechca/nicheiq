import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities, opportunityVotes } from "@/lib/db/schema";
import { ok, notFound, badRequest, unauthorized } from "@/lib/api/response";
import { voteSchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

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
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();

  // Verify the opportunity exists before recording a vote.
  const [opp] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);
  if (!opp) return notFound("Opportunity not found");

  // Upsert the vote — composite PK (opportunityId, userId) means one vote
  // per user per opportunity. Flipping direction overwrites the prior vote.
  await db
    .insert(opportunityVotes)
    .values({
      opportunityId: params.id,
      userId,
      direction: parsed.data.direction,
    })
    .onConflictDoUpdate({
      target: [opportunityVotes.opportunityId, opportunityVotes.userId],
      set: { direction: parsed.data.direction, createdAt: new Date() },
    });

  // Aggregate fresh counts to return to the UI.
  const counts = await db
    .select({
      direction: opportunityVotes.direction,
      count: sql<number>`count(*)::int`,
    })
    .from(opportunityVotes)
    .where(eq(opportunityVotes.opportunityId, params.id))
    .groupBy(opportunityVotes.direction);

  const votes = { up: 0, down: 0 };
  for (const row of counts) {
    if (row.direction === "up") votes.up = row.count;
    else if (row.direction === "down") votes.down = row.count;
  }

  return ok({ vote: parsed.data.direction, votes });
}

// Allow removing your own vote.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  const db = getDb();
  await db
    .delete(opportunityVotes)
    .where(
      and(
        eq(opportunityVotes.opportunityId, params.id),
        eq(opportunityVotes.userId, userId),
      ),
    );

  const counts = await db
    .select({
      direction: opportunityVotes.direction,
      count: sql<number>`count(*)::int`,
    })
    .from(opportunityVotes)
    .where(eq(opportunityVotes.opportunityId, params.id))
    .groupBy(opportunityVotes.direction);

  const votes = { up: 0, down: 0 };
  for (const row of counts) {
    if (row.direction === "up") votes.up = row.count;
    else if (row.direction === "down") votes.down = row.count;
  }

  return ok({ vote: null, votes });
}