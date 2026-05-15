import { NextRequest } from "next/server";
import { and, avg, count, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { SCORE_BUCKETS } from "@/lib/utils/constants";
import { requireSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  // Bucket histogram: one query per bucket. With 5 buckets and a small
  // opportunities table, this is fine and clearer than a single CASE-WHEN
  // SUM query. If opportunities ever grows past ~100k rows, refactor to
  // a single GROUP BY query with the buckets computed via width_bucket().
  const buckets = await Promise.all(
    SCORE_BUCKETS.map(async (b) => {
      const [row] = await db
        .select({ count: count() })
        .from(opportunities)
        .where(and(gte(opportunities.score, b.min), lte(opportunities.score, b.max)));
      return { ...b, count: row?.count ?? 0 };
    }),
  );

  // Average score across all opportunities — single aggregate query.
  const [avgRow] = await db.select({ avg: avg(opportunities.score) }).from(opportunities);
  const avgScore = avgRow?.avg ? Math.round(Number(avgRow.avg) * 10) / 10 : 0;

  // 14-day sparkline of opportunity score averages by created_at day.
  // Once Inngest scoring populates opportunity_scores history, switch this
  // query to that table for a true scoring trend over time.
  const sparkline = await db
    .select({
      day: sql<string>`DATE(${opportunities.createdAt})`.as("day"),
      avg: avg(opportunities.score),
    })
    .from(opportunities)
    .where(sql`${opportunities.createdAt} >= NOW() - INTERVAL '14 days'`)
    .groupBy(sql`DATE(${opportunities.createdAt})`)
    .orderBy(sql`DATE(${opportunities.createdAt})`);

  // Pad to 14 points so the chart always renders smoothly even with sparse data.
  const sparklineValues = sparkline.map((s) => (s.avg ? Math.round(Number(s.avg)) : 0));
  while (sparklineValues.length < 14) sparklineValues.unshift(avgScore);

  return ok({ buckets, sparkline: sparklineValues, avg: avgScore });
}
