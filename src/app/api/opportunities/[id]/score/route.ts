import { NextRequest } from "next/server";
import { eq, avg, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities, signals, trends, goldenRules, feedbackPatterns } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { compute, dimensionsFromHeuristics } from "@/lib/scoring/engine";
import type { GoldenRule, FeedbackPattern } from "@/lib/types";

/**
 * Recompute and persist a single opportunity's score.
 *
 * Previous version computed inline, persisted, then fired
 * `opportunity/score.requested` — and the Inngest handler then re-fetched,
 * re-computed, and re-persisted the same value. Double-write every click.
 *
 * The route is now the single owner of synchronous recomputes (so the
 * "Rescore" button returns the new value immediately). The Inngest handler
 * is still useful for batch jobs — e.g. recomputing every opportunity
 * after a rule change — but it should be invoked explicitly for that
 * purpose, not as a no-op side effect of a synchronous user action.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);
  if (!opp) return notFound();

  const linkedSignals = opp.sourceSignalIds.length
    ? await db.select().from(signals).where(inArray(signals.id, opp.sourceSignalIds))
    : [];

  const [trendRow] = await db
    .select({ avgGrowth: avg(trends.growthPct) })
    .from(trends)
    .where(eq(trends.niche, opp.niche));
  const avgGrowth = Number(trendRow?.avgGrowth ?? 0);

  const ruleRows = await db.select().from(goldenRules).where(eq(goldenRules.active, true));
  const patternRows = await db.select().from(feedbackPatterns);

  // Bridge Drizzle's typed timestamp columns to ISO strings for the
  // GoldenRule / FeedbackPattern shapes. Drizzle types these as Date, but
  // the neon-http driver actually returns them as ISO strings — calling
  // .toISOString() on a string throws. `new Date(x)` accepts either form
  // and normalizes both code paths so this also works if you ever swap to
  // the standard pg driver later.
  const toIso = (v: Date | string): string => (typeof v === "string" ? v : v.toISOString());

  const rules: GoldenRule[] = ruleRows.map((r) => ({
    ...r,
    niche: r.niche as GoldenRule["niche"],
    createdAt: toIso(r.createdAt as unknown as Date | string),
  }));
  const patterns: FeedbackPattern[] = patternRows.map((p) => ({
    ...p,
    niche: p.niche as FeedbackPattern["niche"],
    derivedFrom: p.derivedFrom as FeedbackPattern["derivedFrom"],
    lastConfirmedAt: toIso(p.lastConfirmedAt as unknown as Date | string),
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
    .where(eq(opportunities.id, params.id));

  return ok({ score: breakdown.finalScore, breakdown });
}
