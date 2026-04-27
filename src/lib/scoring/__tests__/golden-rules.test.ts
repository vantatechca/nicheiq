import { describe, it, expect } from "vitest";
import { applyGoldenRules } from "../golden-rules";
import type { GoldenRule } from "@/lib/types";

const opp = {
  title: "Notion second-brain for indie SaaS founders",
  summary: "AI-leveraged Notion template with embedded Loom walkthroughs.",
  niche: "notion_template",
  opportunityType: "replication",
  buildEffort: "weekend",
};

function rule(overrides: Partial<GoldenRule>): GoldenRule {
  return {
    id: "rule_test",
    label: "test rule",
    description: "",
    ruleType: "boost",
    niche: null,
    keywords: [],
    weight: 0.5,
    active: true,
    createdBy: "u",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("applyGoldenRules", () => {
  it("returns no modifiers when no rules match", () => {
    const out = applyGoldenRules(opp, [rule({ keywords: ["zzz"], ruleType: "boost" })]);
    expect(out.modifiers).toHaveLength(0);
    expect(out.delta).toBe(0);
    expect(out.blocked).toBe(false);
  });

  it("matches keywords case-insensitively across title+summary+niche", () => {
    const out = applyGoldenRules(opp, [rule({ keywords: ["AI"], ruleType: "boost", weight: 0.5 })]);
    expect(out.modifiers).toHaveLength(1);
    expect(out.delta).toBeGreaterThan(0);
  });

  it("boost adds positive delta scaled by weight (×20)", () => {
    const w1 = applyGoldenRules(opp, [rule({ keywords: ["notion"], ruleType: "boost", weight: 1 })]);
    const w05 = applyGoldenRules(opp, [rule({ keywords: ["notion"], ruleType: "boost", weight: 0.5 })]);
    expect(w1.delta).toBeGreaterThan(w05.delta);
  });

  it("penalize adds negative delta", () => {
    const out = applyGoldenRules(opp, [
      rule({ id: "r1", keywords: ["notion"], ruleType: "penalize", weight: 0.5 }),
    ]);
    expect(out.delta).toBeLessThan(0);
  });

  it("block short-circuits and forces score to 0", () => {
    const out = applyGoldenRules(opp, [
      rule({ id: "r_block", keywords: ["AI"], ruleType: "block", weight: 1 }),
      rule({ id: "r_boost", keywords: ["notion"], ruleType: "boost", weight: 1 }),
    ]);
    expect(out.blocked).toBe(true);
    expect(out.delta).toBe(-100);
    // boost did not run
    expect(out.modifiers.find((m) => m.outcome === "boost")).toBeUndefined();
  });

  it("require imposes penalty when keywords absent", () => {
    const out = applyGoldenRules(opp, [
      rule({ id: "r_req", keywords: ["never-present"], ruleType: "require", weight: 1 }),
    ]);
    expect(out.delta).toBeLessThan(0);
    expect(out.modifiers[0]?.outcome).toBe("require_failed");
  });

  it("require with present keywords does not penalize", () => {
    const out = applyGoldenRules(opp, [
      rule({ id: "r_req", keywords: ["notion"], ruleType: "require", weight: 1 }),
    ]);
    expect(out.modifiers).toHaveLength(0);
  });

  it("inactive rules are skipped entirely", () => {
    const out = applyGoldenRules(opp, [
      rule({ keywords: ["notion"], ruleType: "boost", weight: 1, active: false }),
    ]);
    expect(out.modifiers).toHaveLength(0);
  });

  it("rules with niche filter only fire on matching niche", () => {
    const wrong = applyGoldenRules(opp, [
      rule({ keywords: ["notion"], ruleType: "boost", weight: 1, niche: "kdp_low_content" }),
    ]);
    expect(wrong.modifiers).toHaveLength(0);
    const right = applyGoldenRules(opp, [
      rule({ keywords: ["notion"], ruleType: "boost", weight: 1, niche: "notion_template" }),
    ]);
    expect(right.modifiers).toHaveLength(1);
  });
});
