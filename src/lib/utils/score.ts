/**
 * Destination: src/lib/utils/score.ts
 *
 * Single source of truth for coercing a persisted `scoreBreakdown` into the
 * canonical structured shape. Replaces the ad-hoc `normalizeBreakdown` that
 * lived inside the opportunity detail page, and fixes the compare-page crash
 * (TypeError: Cannot read properties of undefined (reading 'demand')).
 */
import type { ScoreBreakdown, ScoreDimensionKey } from "@/lib/types";

const DIMENSION_WEIGHTS: Record<ScoreDimensionKey, number> = {
  demand: 0.25,
  competition: 0.2,
  revenue: 0.25,
  buildEffort: 0.15,
  trend: 0.15,
};

// The flat keys a synthesized-but-not-yet-scored opportunity carries (the
// model's self-reported breakdown), mapped onto the canonical dimension keys.
const FLAT_KEY_MAP: Record<string, ScoreDimensionKey> = {
  demandSignal: "demand",
  demand: "demand",
  competition: "competition",
  competitionLevel: "competition",
  monetisation: "revenue",
  monetization: "revenue",
  revenue: "revenue",
  timeToMarket: "buildEffort",
  buildEffort: "buildEffort",
  creatorFit: "trend",
  trend: "trend",
};

function emptyDimensions(): ScoreBreakdown["dimensions"] {
  return {
    demand: { value: 0, weight: DIMENSION_WEIGHTS.demand },
    competition: { value: 0, weight: DIMENSION_WEIGHTS.competition },
    revenue: { value: 0, weight: DIMENSION_WEIGHTS.revenue },
    buildEffort: { value: 0, weight: DIMENSION_WEIGHTS.buildEffort },
    trend: { value: 0, weight: DIMENSION_WEIGHTS.trend },
  };
}

/**
 * Three shapes reach the UI:
 *   1. Scored / manually-created opps — already { dimensions, ruleModifiers, … }.
 *   2. Synthesized opps not yet scored — a FLAT record like
 *      { demandSignal: 18, competition: 15, … } with no `dimensions` key.
 *   3. Missing / null.
 *
 * Reading `.dimensions[key]` on shapes 2 and 3 throws. Route every breakdown
 * through this first so the access is always safe — and so synthesized opps
 * still render real bars (the flat values are mapped, not zeroed).
 */
export function normalizeBreakdown(raw: unknown): ScoreBreakdown {
  const isStructured =
    !!raw &&
    typeof raw === "object" &&
    "dimensions" in raw &&
    !!(raw as { dimensions?: unknown }).dimensions &&
    typeof (raw as { dimensions: unknown }).dimensions === "object";

  if (isStructured) {
    const r = raw as Partial<ScoreBreakdown>;
    return {
      dimensions: { ...emptyDimensions(), ...(r.dimensions as ScoreBreakdown["dimensions"]) },
      ruleModifiers: r.ruleModifiers ?? [],
      patternModifiers: r.patternModifiers ?? [],
      finalScore: r.finalScore ?? 0,
      computedAt: r.computedAt ?? new Date(0).toISOString(),
    };
  }

  const flat = (raw ?? {}) as Record<string, number>;
  const dimensions = emptyDimensions();
  for (const [k, v] of Object.entries(flat)) {
    const mapped = FLAT_KEY_MAP[k];
    if (mapped) dimensions[mapped] = { value: Number(v) || 0, weight: DIMENSION_WEIGHTS[mapped] };
  }

  return {
    dimensions,
    ruleModifiers: [],
    patternModifiers: [],
    finalScore: 0,
    computedAt: new Date(0).toISOString(),
  };
}