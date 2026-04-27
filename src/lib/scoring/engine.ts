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
        rationale: "Search volume + social mentions + sales-velocity proxies.",
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

// Heuristic helpers: derive dimensions from raw signals, used until real crawlers run.

export function dimensionsFromHeuristics(input: {
  signalCount: number;
  trendGrowthPct: number;
  estMonthlyRevenueHigh?: number;
  competitorListings?: number;
  buildEffortKey: string;
}): DimensionInputs {
  const demand = clamp(40 + input.signalCount * 4 + Math.max(0, input.trendGrowthPct), 0, 100);
  const competition = clamp(20 + (input.competitorListings ?? 8) * 4, 0, 100);
  const revenue = clamp(Math.log10(Math.max(1, input.estMonthlyRevenueHigh ?? 1000)) * 22 + 10, 0, 100);
  const trend = clamp(50 + input.trendGrowthPct, 0, 100);
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
