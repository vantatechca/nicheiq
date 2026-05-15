import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { niches, opportunities } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  // Left-join niches → opportunities and sum projected revenue per niche.
  // LEFT JOIN preserves niches with zero opportunities (returning 0 sum
  // rather than excluding them entirely).
  const rows = await db
    .select({
      id: niches.id,
      slug: niches.slug,
      label: niches.label,
      description: niches.description,
      parentId: niches.parentId,
      iconKey: niches.iconKey,
      createdAt: niches.createdAt,
      // coalesce(sum, 0) — handle the LEFT JOIN null case for niches with no opps
      projectedRevenueUsd: sql<number>`COALESCE(SUM(${opportunities.projectedRevenueUsd}), 0)::float`,
      opportunityCount: sql<number>`COUNT(${opportunities.id})::int`,
    })
    .from(niches)
    .leftJoin(opportunities, eq(opportunities.niche, niches.slug))
    .groupBy(
      niches.id,
      niches.slug,
      niches.label,
      niches.description,
      niches.parentId,
      niches.iconKey,
      niches.createdAt,
    )
    .orderBy(niches.label);

  return ok({ niches: rows });
}
