import { describe, it, expect } from "vitest";
import { dimensionsFromHeuristics, aggregateSignalEngagement } from "../engine";

describe("aggregateSignalEngagement", () => {
  it("returns 0 for no signals", () => {
    expect(aggregateSignalEngagement([])).toBe(0);
  });

  it("averages per-signal scores", () => {
    expect(aggregateSignalEngagement([{ score: 20 }, { score: 80 }])).toBe(50);
  });

  it("treats null/undefined scores as 0 (tolerates pre-score seed rows)", () => {
    expect(aggregateSignalEngagement([{ score: null }, { score: 40 }])).toBe(20);
    expect(aggregateSignalEngagement([{}, { score: 60 }])).toBe(30);
  });

  it("clamps to 0-100", () => {
    expect(aggregateSignalEngagement([{ score: 999 }])).toBe(100);
  });
});

describe("demand dimension: engagement intensity", () => {
  const base = { signalCount: 3, trendGrowthPct: 0, buildEffortKey: "week" };

  it("lifts demand when engagement is high, at equal signal count", () => {
    const cold = dimensionsFromHeuristics({ ...base, avgEngagement: 5 });
    const hot = dimensionsFromHeuristics({ ...base, avgEngagement: 90 });
    expect(hot.demand).toBeGreaterThan(cold.demand);
  });

  it("is additive: omitting avgEngagement == passing 0 == previous behaviour", () => {
    const legacy = dimensionsFromHeuristics(base); // no engagement field at all
    const zero = dimensionsFromHeuristics({ ...base, avgEngagement: 0 });
    expect(legacy.demand).toBe(zero.demand);
    expect(legacy.demand).toBe(5 + 3 * 6); // 23, exactly the old count-only value
  });

  it("does not let engagement bleed into other dimensions", () => {
    const a = dimensionsFromHeuristics({ ...base, avgEngagement: 0 });
    const b = dimensionsFromHeuristics({ ...base, avgEngagement: 100 });
    expect(a.competition).toBe(b.competition);
    expect(a.revenue).toBe(b.revenue);
    expect(a.trend).toBe(b.trend);
    expect(a.buildEffort).toBe(b.buildEffort);
  });
});