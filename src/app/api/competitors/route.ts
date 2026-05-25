import { NextRequest } from "next/server";
import { and, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { competitors } from "@/lib/db/schema";
import { ok, badRequest, created, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { excludeSeedsClause, shouldIncludeSeeds } from "@/lib/db/seed-filter";

const competitorSchema = z.object({
  creatorId: z.string(),
  depth: z.enum(["light", "deep"]).default("light"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  // Seed competitors point to seed creators (creator_N), so filter on the
  // creator reference — keeps page + export consistent (both real-only).
  const conditions = excludeSeedsClause(competitors.creatorId, shouldIncludeSeeds(req.nextUrl));
  const rows = await db
    .select()
    .from(competitors)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(competitors.lastReviewedAt));
  return ok({ competitors: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = competitorSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();
  const [competitor] = await db
    .insert(competitors)
    .values({
      id: `comp_${Date.now()}`,
      creatorId: parsed.data.creatorId,
      depth: parsed.data.depth,
      notes: parsed.data.notes ?? "",
      playbook: {
        pricingTiers: [],
        postingCadence: "",
        topTags: [],
        funnels: [],
        signatureStyle: "",
      },
    })
    .returning();

  return created({ competitor });
}