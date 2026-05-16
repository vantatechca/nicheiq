import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { opportunities, signals, trends, goldenRules, feedbackPatterns } from "@/lib/db/schema";
import { eq, avg, inArray } from "drizzle-orm";
import { compute, dimensionsFromHeuristics } from "@/lib/scoring/engine";
import type { GoldenRule, FeedbackPattern } from "@/lib/types";

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

      const ruleRows = await db
        .select()
        .from(goldenRules)
        .where(eq(goldenRules.active, true));
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