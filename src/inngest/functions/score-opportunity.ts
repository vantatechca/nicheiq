import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import {
  opportunities,
  signals,
  trends,
  goldenRules,
  feedbackPatterns,
  products,
} from "@/lib/db/schema";
import { eq, avg, inArray, and, isNull, count } from "drizzle-orm";
import {
  compute,
  dimensionsFromHeuristics,
  aggregateSignalEngagement,
} from "@/lib/scoring/engine";
import type { GoldenRule, FeedbackPattern } from "@/lib/types";

// Median of the positive revenue figures — robust to the occasional Envato
// mega-seller that would wildly inflate a mean. Returns null when there are no
// usable comparables so the caller can fall back.
function medianPositive(values: Array<number | null>): number | null {
  const nums = values
    .filter((v): v is number => typeof v === "number" && v > 0)
    .sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid]! : (nums[mid - 1]! + nums[mid]!) / 2;
}

export const scoreOpportunity = inngest.createFunction(
  { id: "score-opportunity", retries: 2, concurrency: { limit: 4 } },
  { event: "opportunity/score.requested" },
  async ({ event, step }) => {
    const { opportunityId } = event.data as { opportunityId: string };

    const result = await step.run("compute-score", async () => {
      const db = getDb();

      const [opp] = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, opportunityId))
        .limit(1);
      if (!opp) throw new Error(`Opportunity ${opportunityId} not found`);

      const linkedSignals = opp.sourceSignalIds.length
        ? await db.select().from(signals).where(inArray(signals.id, opp.sourceSignalIds))
        : [];

      const [trendRow] = await db
        .select({ avgGrowth: avg(trends.growthPct) })
        .from(trends)
        .where(eq(trends.niche, opp.niche));
      const avgGrowth = Number(trendRow?.avgGrowth ?? 0);

      // Real, sales-derived market revenue for the revenue dimension.
      // Prefer products explicitly linked to this opportunity; otherwise use
      // same-niche competitor comparables (opportunityId IS NULL = crawled
      // market data, not our own shipped products). Either beats the AI's
      // projectedRevenueUsd guess, which was the previous input.
      const revenueRows = opp.sourceProductIds.length
        ? await db
            .select({ rev: products.estMonthlyRevenueHigh })
            .from(products)
            .where(inArray(products.id, opp.sourceProductIds))
        : await db
            .select({ rev: products.estMonthlyRevenueHigh })
            .from(products)
            .where(and(eq(products.niche, opp.niche), isNull(products.opportunityId)))
            .limit(500);
      const marketRevenueHigh = medianPositive(revenueRows.map((r) => r.rev));

      // Niche listing density for the competition dimension. Always the whole
      // market (same niche, competitor rows only — opportunityId IS NULL),
      // independent of the revenue branch above: competition is about how
      // crowded the niche is, not about this opportunity's linked products.
      const [countRow] = await db
        .select({ cnt: count() })
        .from(products)
        .where(and(eq(products.niche, opp.niche), isNull(products.opportunityId)));
      const nicheProductCount = Number(countRow?.cnt ?? 0);

      const ruleRows = await db.select().from(goldenRules).where(eq(goldenRules.active, true));
      const patternRows = await db.select().from(feedbackPatterns);

      // Drizzle returns Date for timestamp columns; the GoldenRule and
      // FeedbackPattern types in @/lib/types use ISO strings. Bridge here
      // rather than at every call site (replaces the previous `as any`).
      // The niche and derivedFrom casts trust the DB to hold valid enum
      // values — Postgres enforces this at write time.
      const rules: GoldenRule[] = ruleRows.map((r) => ({
        ...r,
        niche: r.niche as GoldenRule["niche"],
        createdAt: r.createdAt.toISOString(),
      }));
      const patterns: FeedbackPattern[] = patternRows.map((p) => ({
        ...p,
        niche: p.niche as FeedbackPattern["niche"],
        derivedFrom: p.derivedFrom as FeedbackPattern["derivedFrom"],
        lastConfirmedAt: p.lastConfirmedAt.toISOString(),
      }));

      const dimensions = dimensionsFromHeuristics({
        signalCount: linkedSignals.length,
        // Engagement intensity of the linked signals (log-scaled upvote/vote/
        // favourite/comment blend persisted in signals.score).
        avgEngagement: aggregateSignalEngagement(linkedSignals),
        trendGrowthPct: avgGrowth,
        // Real market money when we have comparables; AI projection only as a
        // last resort.
        estMonthlyRevenueHigh: marketRevenueHigh ?? opp.projectedRevenueUsd,
        // Real niche listing density (was opp.sourceProductIds.length, which
        // is 0 for synthesized opportunities — so competition never moved).
        competitorListings: nicheProductCount,
        buildEffortKey: opp.buildEffort,
      });

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
        rules,
        patterns,
      });

      await db
        .update(opportunities)
        .set({
          score: breakdown.finalScore,
          scoreBreakdown: breakdown,
          updatedAt: new Date(),
        })
        .where(eq(opportunities.id, opportunityId));

      return {
        opportunityId,
        score: breakdown.finalScore,
        computedAt: new Date().toISOString(),
      };
    });

    return result;
  },
);