/**
 * Destination: src/app/api/niches/route.ts  (REPLACES the current bare-rows version)
 *
 * Returns each niche enriched with the aggregates the niches page needs but the
 * `niches` table does not store:
 *   - opportunityCount  : COUNT of opportunities in the niche
 *   - productCount      : COUNT of products in the niche
 *   - momentumScore     : AVG of trend momentum for the niche (0 if no trends)
 *   - projectedRevenueUsd: SUM of projected revenue (handy for sorting/detail)
 *
 * These were previously hard-coded in mockNiches; computing them here is what
 * lets the niches page run on live data. Three separate grouped subqueries are
 * joined so the counts don't multiply each other (a single multi-join would
 * fan out rows and inflate every COUNT).
 */
import { NextRequest } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { niches, opportunities, products, trends } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  // Per-niche aggregates, each grouped on its own so counts stay independent.
  const oppAgg = db
    .select({
      niche: opportunities.niche,
      count: sql<number>`COUNT(*)::int`.as("opp_count"),
      revenue: sql<number>`COALESCE(SUM(${opportunities.projectedRevenueUsd}), 0)::float`.as("opp_revenue"),
    })
    .from(opportunities)
    .groupBy(opportunities.niche)
    .as("opp_agg");

  const prodAgg = db
    .select({
      niche: products.niche,
      count: sql<number>`COUNT(*)::int`.as("prod_count"),
    })
    .from(products)
    .groupBy(products.niche)
    .as("prod_agg");

  const trendAgg = db
    .select({
      niche: trends.niche,
      momentum: sql<number>`COALESCE(AVG(${trends.momentumScore}), 0)::float`.as("trend_momentum"),
    })
    .from(trends)
    .groupBy(trends.niche)
    .as("trend_agg");

  const rows = await db
    .select({
      id: niches.id,
      slug: niches.slug,
      label: niches.label,
      description: niches.description,
      iconKey: niches.iconKey,
      opportunityCount: sql<number>`COALESCE(${oppAgg.count}, 0)`,
      productCount: sql<number>`COALESCE(${prodAgg.count}, 0)`,
      projectedRevenueUsd: sql<number>`COALESCE(${oppAgg.revenue}, 0)`,
      momentumScore: sql<number>`ROUND(COALESCE(${trendAgg.momentum}, 0))::int`,
    })
    .from(niches)
    .leftJoin(oppAgg, eq(oppAgg.niche, niches.slug))
    .leftJoin(prodAgg, eq(prodAgg.niche, niches.slug))
    .leftJoin(trendAgg, eq(trendAgg.niche, niches.slug))
    .orderBy(asc(niches.label));

  return ok({ niches: rows });
}