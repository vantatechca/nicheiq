import type { GoldenRule } from "@/lib/types";
import type { Opportunity } from "@/lib/types";

export type RuleMatch = {
  rule: GoldenRule;
  matched: string[];
  delta: number;
  outcome: "block" | "boost" | "penalize" | "require_failed";
};

interface OpportunityShape {
  title: string;
  summary: string;
  niche: string;
  opportunityType: string;
  buildEffort: string;
  aiRationale?: string;
}

function matchKeywords(o: OpportunityShape, keywords: string[]) {
  const haystack = (
    o.title + " " + o.summary + " " + (o.aiRationale ?? "") + " " + o.niche + " " + o.opportunityType
  ).toLowerCase();
  return keywords.filter((k) => haystack.includes(k.toLowerCase()));
}

export function applyGoldenRules(o: OpportunityShape, rules: GoldenRule[]) {
  const active = rules.filter((r) => r.active);
  const modifiers: RuleMatch[] = [];
  let delta = 0;
  let blocked = false;

  // Block first — short-circuit if any block rule matches
  for (const rule of active.filter((r) => r.ruleType === "block")) {
    if (rule.niche && rule.niche !== o.niche) continue;
    const matched = matchKeywords(o, rule.keywords);
    if (matched.length > 0) {
      modifiers.push({ rule, matched, delta: -100, outcome: "block" });
      blocked = true;
    }
  }
  if (blocked) {
    return { delta: -100, modifiers, blocked: true };
  }

  // Boost / Penalize
  for (const rule of active.filter((r) => r.ruleType === "boost" || r.ruleType === "penalize")) {
    if (rule.niche && rule.niche !== o.niche) continue;
    const matched = matchKeywords(o, rule.keywords);
    if (matched.length > 0) {
      const sign = rule.ruleType === "boost" ? 1 : -1;
      const change = Math.round(sign * rule.weight * 20);
      delta += change;
      modifiers.push({
        rule,
        matched,
        delta: change,
        outcome: rule.ruleType,
      });
    }
  }

  // Require — penalty if NOT satisfied
  for (const rule of active.filter((r) => r.ruleType === "require")) {
    if (rule.niche && rule.niche !== o.niche) continue;
    const matched = matchKeywords(o, rule.keywords);
    if (matched.length === 0) {
      const change = -Math.round(rule.weight * 15);
      delta += change;
      modifiers.push({
        rule,
        matched: [],
        delta: change,
        outcome: "require_failed",
      });
    }
  }

  return { delta, modifiers, blocked: false };
}

export function summarizeRuleModifiers(modifiers: RuleMatch[]) {
  return modifiers.map((m) => ({
    ruleId: m.rule.id,
    label: m.rule.label,
    ruleType: m.rule.ruleType,
    delta: m.delta,
    matched: m.matched,
  }));
}
