import type { FeedbackPattern } from "@/lib/types";

interface OpportunityShape {
  title: string;
  summary: string;
  niche: string;
  opportunityType: string;
  buildEffort: string;
}

export type PatternMatch = {
  pattern: FeedbackPattern;
  delta: number;
};

const MAX_COMBINED = 10;

export function applyFeedbackPatterns(o: OpportunityShape, patterns: FeedbackPattern[]) {
  const haystack = (o.title + " " + o.summary + " " + o.niche + " " + o.opportunityType).toLowerCase();
  const matches: PatternMatch[] = [];
  for (const p of patterns) {
    if (p.niche && p.niche !== o.niche) continue;
    const matched = p.signalKeywords.some((k) => haystack.includes(k.toLowerCase()));
    if (!matched) continue;
    const direction = p.derivedFrom === "abandons" ? -1 : 1;
    const change = Math.round(direction * p.weight * p.confidence * 8);
    if (change !== 0) matches.push({ pattern: p, delta: change });
  }
  // Cap combined absolute delta at ±10
  const totalRaw = matches.reduce((s, m) => s + m.delta, 0);
  const scale = Math.abs(totalRaw) > MAX_COMBINED ? MAX_COMBINED / Math.abs(totalRaw) : 1;
  const scaled = matches.map((m) => ({ ...m, delta: Math.round(m.delta * scale) }));
  const total = scaled.reduce((s, m) => s + m.delta, 0);
  return { delta: total, modifiers: scaled };
}

export function summarizePatternModifiers(matches: PatternMatch[]) {
  return matches.map((m) => ({ patternId: m.pattern.id, label: m.pattern.label, delta: m.delta }));
}
