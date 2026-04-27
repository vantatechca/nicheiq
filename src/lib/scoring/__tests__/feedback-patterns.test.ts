import { describe, it, expect } from "vitest";
import { applyFeedbackPatterns } from "../feedback-patterns";
import type { FeedbackPattern } from "@/lib/types";

const opp = {
  title: "AI prompt pack for cold outreach",
  summary: "Curated Claude prompts for outbound sales.",
  niche: "ai_prompt_pack",
  opportunityType: "trend_play",
  buildEffort: "weekend",
};

function pattern(overrides: Partial<FeedbackPattern>): FeedbackPattern {
  return {
    id: "p_test",
    label: "test pattern",
    description: "",
    derivedFrom: "saves",
    confidence: 1,
    signalKeywords: [],
    niche: null,
    weight: 1,
    lastConfirmedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("applyFeedbackPatterns", () => {
  it("ignores patterns with no keyword match", () => {
    const out = applyFeedbackPatterns(opp, [pattern({ signalKeywords: ["zzz"] })]);
    expect(out.delta).toBe(0);
    expect(out.modifiers).toHaveLength(0);
  });

  it("positive delta from save/build/vote-derived patterns", () => {
    const out = applyFeedbackPatterns(opp, [pattern({ signalKeywords: ["claude"], derivedFrom: "saves" })]);
    expect(out.delta).toBeGreaterThan(0);
    expect(out.modifiers).toHaveLength(1);
  });

  it("negative delta from abandons-derived patterns", () => {
    const out = applyFeedbackPatterns(opp, [pattern({ signalKeywords: ["claude"], derivedFrom: "abandons" })]);
    expect(out.delta).toBeLessThan(0);
  });

  it("scales delta by weight × confidence", () => {
    const high = applyFeedbackPatterns(opp, [pattern({ signalKeywords: ["claude"], weight: 1, confidence: 1 })]);
    const low = applyFeedbackPatterns(opp, [pattern({ signalKeywords: ["claude"], weight: 0.2, confidence: 0.4 })]);
    expect(high.delta).toBeGreaterThan(low.delta);
  });

  it("respects niche filter", () => {
    const wrongNiche = applyFeedbackPatterns(opp, [
      pattern({ signalKeywords: ["claude"], niche: "kdp_low_content" }),
    ]);
    expect(wrongNiche.modifiers).toHaveLength(0);

    const rightNiche = applyFeedbackPatterns(opp, [
      pattern({ signalKeywords: ["claude"], niche: "ai_prompt_pack" }),
    ]);
    expect(rightNiche.modifiers).toHaveLength(1);
  });

  it("caps combined absolute delta at 10", () => {
    const many = Array.from({ length: 8 }).map((_, i) =>
      pattern({ id: `p${i}`, signalKeywords: ["claude", "ai"], weight: 1, confidence: 1 }),
    );
    const out = applyFeedbackPatterns(opp, many);
    expect(Math.abs(out.delta)).toBeLessThanOrEqual(10);
  });
});
