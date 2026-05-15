import { NextRequest } from "next/server";
import { eq, avg, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities, signals, trends, goldenRules, feedbackPatterns } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { compute, dimensionsFromHeuristics } from "@/lib/scoring/engine";
import { inngest } from "@/inngest/client";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  // Fetch opportunity
  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);
  if (!opp) return notFound();

  // Fetch linked signals
  const linkedSignals = opp.sourceSignalIds.length
    ? await db.select().from(signals).where(inArray(signals.id, opp.sourceSignalIds))
    : [];

  // Fetch avg trend growth for niche
  const [trendRow] = await db
    .select({ avgGrowth: avg(trends.growthPct) })
    .from(trends)
    .where(eq(trends.niche, opp.niche));
  const avgGrowth = Number(trendRow?.avgGrowth ?? 0);

  // Fetch active rules + patterns
  const rules = await db.select().from(goldenRules).where(eq(goldenRules.active, true));
  const patterns = await db.select().from(feedbackPatterns);

  // Compute dimensions
  const dimensions = dimensionsFromHeuristics({
    signalCount: linkedSignals.length,
    trendGrowthPct: avgGrowth,
    estMonthlyRevenueHigh: opp.projectedRevenueUsd,
    competitorListings: opp.sourceProductIds.length,
    buildEffortKey: opp.buildEffort,
  });

  // Compute score
  const breakdown = compute({
    opportunity: {
      title: opp.title,
      summary: opp.summary,
      niche: opp.niche,
      opportunityType: opp.opportunityType,
      buildEffort: opp.buildEffort,
      aiRationale: opp.aiRationale,
    },
    dimensions,
    rules: rules as any,
    patterns: patterns as any,
  });

  // Persist
  await db
    .update(opportunities)
    .set({
      score: breakdown.finalScore,
      scoreBreakdown: breakdown,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, params.id));

  // Fire Inngest event for downstream reactions
  await inngest.send({
    name: "opportunity/score.requested",
    data: { opportunityId: params.id, score: breakdown.finalScore },
  });

  return ok({ score: breakdown.finalScore, breakdown });
}
