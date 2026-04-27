import { NextRequest } from "next/server";
import { findOpportunity, mockGoldenRules, mockFeedbackPatterns, mockSignals, mockTrends } from "@/mock/data";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { compute, dimensionsFromHeuristics } from "@/lib/scoring/engine";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const opp = findOpportunity(params.id);
  if (!opp) return notFound();

  const linkedSignals = mockSignals.filter((s) => opp.sourceSignalIds.includes(s.id));
  const trendsForNiche = mockTrends.filter((t) => t.niche === opp.niche);
  const avgGrowth =
    trendsForNiche.length > 0
      ? trendsForNiche.reduce((s, t) => s + t.growthPct, 0) / trendsForNiche.length
      : 0;

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
    rules: mockGoldenRules,
    patterns: mockFeedbackPatterns,
  });

  return ok({ score: breakdown.finalScore, breakdown });
}
