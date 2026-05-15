import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { opportunities, signals, trends, goldenRules, feedbackPatterns } from "@/lib/db/schema";
import { eq, avg, inArray } from "drizzle-orm";
import { compute, dimensionsFromHeuristics } from "@/lib/scoring/engine";

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

      const rules = await db.select().from(goldenRules).where(eq(goldenRules.active, true));
      const patterns = await db.select().from(feedbackPatterns);

      const dimensions = dimensionsFromHeuristics({
        signalCount: linkedSignals.length,
        trendGrowthPct: avgGrowth,
        estMonthlyRevenueHigh: opp.projectedRevenueUsd,
        competitorListings: opp.sourceProductIds.length,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rules: rules as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patterns: patterns as any,
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
