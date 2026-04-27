import { describe, it, expect } from "vitest";
import { compute, dimensionsFromHeuristics } from "../engine";
import type { GoldenRule, FeedbackPattern } from "@/lib/types";

const baseOpp = {
  title: "AI prompt pack for cold outreach",
  summary: "Curated Claude prompts for outbound sales.",
  niche: "ai_prompt_pack",
  opportunityType: "trend_play",
  buildEffort: "weekend",
};

const goodDims = {
  demand: 80,
  competition: 30,
  revenue: 75,
  buildEffort: 15,
  trend: 80,
};

describe("scoring engine", () => {
  it("returns finalScore between 0 and 100", () => {
    const out = compute({ opportunity: baseOpp, dimensions: goodDims, rules: [], patterns: [] });
    expect(out.finalScore).toBeGreaterThanOrEqual(0);
    expect(out.finalScore).toBeLessThanOrEqual(100);
  });

  it("blocks when block rule matches", () => {
    const blockRule: GoldenRule = {
      id: "rule_block",
      label: "Block AI",
      description: "blocks ai prompt packs",
      ruleType: "block",
      niche: null,
      keywords: ["claude"],
      weight: 1,
      active: true,
      createdBy: "test",
      createdAt: new Date().toISOString(),
    };
    const out = compute({ opportunity: baseOpp, dimensions: goodDims, rules: [blockRule] });
    expect(out.finalScore).toBe(0);
    expect(out.ruleModifiers[0]?.ruleType).toBe("block");
  });

  it("boosts when boost rule matches", () => {
    const boostRule: GoldenRule = {
      id: "rule_boost",
      label: "Boost AI",
      description: "boost AI",
      ruleType: "boost",
      niche: null,
      keywords: ["claude", "ai"],
      weight: 0.8,
      active: true,
      createdBy: "test",
      createdAt: new Date().toISOString(),
    };
    const baseline = compute({ opportunity: baseOpp, dimensions: goodDims, rules: [] });
    const boosted = compute({ opportunity: baseOpp, dimensions: goodDims, rules: [boostRule] });
    expect(boosted.finalScore).toBeGreaterThanOrEqual(baseline.finalScore);
    expect(boosted.ruleModifiers[0]?.delta).toBeGreaterThan(0);
  });

  it("derives dimensions from heuristics deterministically", () => {
    const a = dimensionsFromHeuristics({
      signalCount: 5,
      trendGrowthPct: 15,
      estMonthlyRevenueHigh: 4000,
      competitorListings: 8,
      buildEffortKey: "weekend",
    });
    const b = dimensionsFromHeuristics({
      signalCount: 5,
      trendGrowthPct: 15,
      estMonthlyRevenueHigh: 4000,
      competitorListings: 8,
      buildEffortKey: "weekend",
    });
    expect(a).toEqual(b);
    expect(a.buildEffort).toBe(10);
  });

  it("applies feedback patterns within ±10 cap", () => {
    const pattern: FeedbackPattern = {
      id: "p1",
      label: "Likes AI",
      description: "Likes AI",
      derivedFrom: "saves",
      confidence: 1,
      signalKeywords: ["ai", "claude"],
      niche: null,
      weight: 1,
      lastConfirmedAt: new Date().toISOString(),
    };
    const out = compute({ opportunity: baseOpp, dimensions: goodDims, patterns: [pattern] });
    expect(out.patternModifiers[0]?.delta).toBeLessThanOrEqual(10);
  });
});
