import type { FeedbackPattern, GoldenRule, ScoreBreakdown } from "@/lib/types";
import { clamp } from "@/lib/utils/format";
import { applyGoldenRules, summarizeRuleModifiers } from "./golden-rules";
import { applyFeedbackPatterns, summarizePatternModifiers } from "./feedback-patterns";

export interface DimensionInputs {
  demand: number; // 0-100, higher = more demand
  competition: number; // 0-100, higher = more competition
  revenue: number; // 0-100, mapped from est. revenue range
  buildEffort: number; // 0-100, higher = more effort
  trend: number; // 0-100, week-over-week growth proxy
}

export interface ScoreInputs {
  opportunity: {
    title: string;
    summary: string;
    niche: string;
    opportunityType: string;
    buildEffort: string;
    aiRationale?: string;
  };
  dimensions: DimensionInputs;
  rules?: GoldenRule[];
  patterns?: FeedbackPattern[];
}

const DEFAULT_WEIGHTS = {
  demand: 0.25,
  competition: 0.2,
  revenue: 0.25,
  buildEffort: 0.15,
  trend: 0.15,
} as const;

export function compute(input: ScoreInputs): ScoreBreakdown {
  const { dimensions, rules = [], patterns = [], opportunity } = input;

  // Dimension blend (note: competition + buildEffort are inverted: less is better)
  const baseRaw =
    DEFAULT_WEIGHTS.demand * dimensions.demand +
    DEFAULT_WEIGHTS.competition * (100 - dimensions.competition) +
    DEFAULT_WEIGHTS.revenue * dimensions.revenue +
    DEFAULT_WEIGHTS.buildEffort * (100 - dimensions.buildEffort) +
    DEFAULT_WEIGHTS.trend * dimensions.trend;

  let score = clamp(baseRaw, 0, 100);

  const ruleResult = applyGoldenRules(opportunity, rules);
  if (ruleResult.blocked) {
    score = 0;
  } else {
    score = clamp(score + ruleResult.delta, 0, 100);
  }

  const patternResult = applyFeedbackPatterns(opportunity, patterns);
  score = clamp(score + patternResult.delta, 0, 100);

  return {
    dimensions: {
      demand: {
        value: dimensions.demand,
        weight: DEFAULT_WEIGHTS.demand,
        rationale: "Signal breadth + engagement intensity (upvotes/votes/favourites) + trend.",
      },
      competition: {
        value: dimensions.competition,
        weight: DEFAULT_WEIGHTS.competition,
        rationale: "Listing density and creator concentration in niche (inverted).",
      },
      revenue: {
        value: dimensions.revenue,
        weight: DEFAULT_WEIGHTS.revenue,
        rationale: "Est. price × est. units × margin envelope.",
      },
      buildEffort: {
        value: dimensions.buildEffort,
        weight: DEFAULT_WEIGHTS.buildEffort,
        rationale: "Mapped from build effort tag (weekend=10 → year_plus=90).",
      },
      trend: {
        value: dimensions.trend,
        weight: DEFAULT_WEIGHTS.trend,
        rationale: "Week-over-week growth across linked trend keywords.",
      },
    },
    ruleModifiers: summarizeRuleModifiers(ruleResult.modifiers),
    patternModifiers: summarizePatternModifiers(patternResult.modifiers),
    finalScore: Math.round(score),
    computedAt: new Date().toISOString(),
  };
}

/**
 * Average engagement across an opportunity's linked signals, on the same 0-100
 * scale that `_persist-signals` already stores in `signals.score` (a log-scaled
 * blend of upvotes / votes / favourites / comments). Pure + null-safe so it's
 * unit-testable and tolerant of seed rows that predate the score column.
 */
export function aggregateSignalEngagement(signals: Array<{ score?: number | null }>): number {
  if (!signals.length) return 0;
  const sum = signals.reduce((acc, s) => acc + (Number(s.score) || 0), 0);
  return clamp(sum / signals.length, 0, 100);
}

// Heuristic helpers: derive dimensions from raw signals, used until real crawlers run.
//
// Base values are tuned so a totally evidence-less opportunity (zero signals,
// flat trend, no revenue estimate, no competitor data) scores LOW — around
// 20-25 overall. The previous bases of 40/50/+10 produced a misleading ~40
// score for opportunities with no supporting data, masking weak signals as
// merely "mediocre". Once real signals/trends/revenue numbers arrive, the
// multipliers carry the score upward as before.

export function dimensionsFromHeuristics(input: {
  signalCount: number;
  trendGrowthPct: number;
  estMonthlyRevenueHigh?: number;
  competitorListings?: number;
  buildEffortKey: string;
  /**
   * Mean per-signal engagement (0-100) across the opportunity's linked signals.
   * Optional and ADDITIVE: omit it and demand falls back to the previous
   * count-only behaviour (so existing snapshots/tests are unaffected).
   */
  avgEngagement?: number;
}): DimensionInputs {
  // Demand = breadth (how many signals) + intensity (how engaged those signals
  // are) + trend. The intensity term is what makes 3 threads at 5k upvotes beat
  // 3 threads at 5 upvotes — previously they scored identically. At the 0.35
  // factor a red-hot niche (avg 90) adds ~31 points; a lukewarm one (avg 10)
  // adds ~3, so it differentiates without swamping the breadth/trend signals.
  const intensity = input.avgEngagement != null ? clamp(input.avgEngagement, 0, 100) * 0.35 : 0;
  const demand = clamp(
    5 + input.signalCount * 6 + intensity + Math.max(0, input.trendGrowthPct),
    0,
    100,
  );
  // Competition rises with how crowded the niche is. Log-scaled because real
  // marketplace listing counts span single digits to thousands — the old linear
  // `* 4` pegged almost every niche at max. Now: empty=20, 10≈43, 100≈64,
  // 1000≈86, saturating gracefully.
  const competition = clamp(20 + Math.log10(1 + (input.competitorListings ?? 0)) * 22, 0, 100);
  // No revenue estimate → ~0 (was: defaulted to $1000 and gave ~31).
  const revenue = clamp(Math.log10(Math.max(1, input.estMonthlyRevenueHigh ?? 0)) * 22, 0, 100);
  const trend = clamp(25 + input.trendGrowthPct, 0, 100);
  const effortMap: Record<string, number> = {
    weekend: 10,
    week: 25,
    month: 55,
    quarter: 75,
    year_plus: 92,
  };
  const buildEffort = effortMap[input.buildEffortKey] ?? 50;
  return { demand, competition, revenue, buildEffort, trend };
}