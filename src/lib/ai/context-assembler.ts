import {
  mockOpportunities,
  mockNiches,
  mockGoldenRules,
  mockFeedbackPatterns,
  mockActivity,
  mockCreators,
  findOpportunity,
  findCreator,
  findNiche,
  findResellable,
} from "@/mock/data";
import { MODE_PROMPTS, PERSISTENT_IDENTITY } from "./prompts";

export type BrainMode =
  | "global"
  | "niche"
  | "opportunity"
  | "creator"
  | "build_plan"
  | "replicate"
  | "dataset_review";

export interface ContextRefs {
  opportunityIds?: string[];
  productIds?: string[];
  creatorIds?: string[];
  niches?: string[];
  assetIds?: string[];
}

export interface AssembleArgs {
  mode: BrainMode;
  refIds?: ContextRefs;
  userId: string;
  tokenBudget?: number;
}

const MAX_OPPS_GLOBAL = 8;
const MAX_RULES = 12;
const MAX_PATTERNS = 6;
const MAX_DECISIONS = 5;
const APPROX_CHARS_PER_TOKEN = 4;

function fitToBudget(text: string, tokenBudget: number) {
  const max = tokenBudget * APPROX_CHARS_PER_TOKEN;
  if (text.length <= max) return text;
  return text.slice(0, max - 80) + "\n…[truncated to fit token budget]";
}

function rulesBlock() {
  const active = mockGoldenRules.filter((r) => r.active).slice(0, MAX_RULES);
  return active
    .map((r) => `- [${r.ruleType.toUpperCase()} w=${r.weight}] ${r.label}: ${r.keywords.join(", ") || "(no kw)"}`)
    .join("\n");
}

function patternsBlock() {
  return mockFeedbackPatterns
    .slice(0, MAX_PATTERNS)
    .map((p) => `- [${p.derivedFrom}] ${p.label} (conf ${(p.confidence * 100).toFixed(0)}%)`)
    .join("\n");
}

function recentDecisions(userId: string) {
  return mockActivity
    .filter((a) => a.userId === userId || a.userId === "user_andrei")
    .slice(0, MAX_DECISIONS)
    .map((a) => `- ${a.action} ${a.entityType} (${a.entityId})`)
    .join("\n");
}

function globalContext() {
  const top = mockOpportunities.slice(0, MAX_OPPS_GLOBAL);
  const rising = [...mockNiches]
    .sort((a, b) => b.momentumScore - a.momentumScore)
    .slice(0, 5)
    .map((n) => `- ${n.label} (mom ${n.momentumScore}, ${n.opportunityCount} opps)`)
    .join("\n");
  return [
    "TOP OPPORTUNITIES:",
    top.map((o) => `- ${o.id} [score ${o.score}] ${o.title} — ${o.summary}`).join("\n"),
    "\nRISING NICHES:",
    rising,
  ].join("\n");
}

function nicheContext(niches: string[]) {
  return niches
    .map((slug) => {
      const n = findNiche(slug);
      if (!n) return `Niche '${slug}' not found.`;
      const opps = mockOpportunities.filter((o) => o.niche === slug).slice(0, 6);
      const creators = mockCreators.filter((c) => c.niches.includes(slug)).slice(0, 4);
      return [
        `NICHE ${n.label} (${n.slug}) · momentum ${n.momentumScore}`,
        n.description,
        "OPPS:",
        opps.map((o) => `- ${o.id} [${o.score}] ${o.title}`).join("\n"),
        "CREATORS:",
        creators
          .map((c) => `- ${c.id} ${c.displayName} (${c.handle}) · est rev ${c.totalEstRevenueUsd}`)
          .join("\n"),
      ].join("\n");
    })
    .join("\n\n");
}

function opportunityContext(ids: string[]) {
  return ids
    .map((id) => {
      const o = findOpportunity(id);
      if (!o) return `Opportunity '${id}' not found.`;
      const sb = o.scoreBreakdown.dimensions;
      return [
        `OPPORTUNITY ${o.id} [score ${o.score}, ${o.status}, ${o.buildEffort}]`,
        `Title: ${o.title}`,
        `Summary: ${o.summary}`,
        `Niche: ${o.niche} · Type: ${o.opportunityType}`,
        `Score breakdown — demand:${sb.demand.value} comp:${sb.competition.value} rev:${sb.revenue.value} effort:${sb.buildEffort.value} trend:${sb.trend.value}`,
        `AI rationale: ${o.aiRationale}`,
        `Linked products: ${o.sourceProductIds.join(", ")}`,
        `Linked signals: ${o.sourceSignalIds.join(", ")}`,
      ].join("\n");
    })
    .join("\n\n");
}

function creatorContext(ids: string[]) {
  return ids
    .map((id) => {
      const c = findCreator(id);
      if (!c) return `Creator '${id}' not found.`;
      const p = c.playbook;
      return [
        `CREATOR ${c.id} ${c.displayName} (${c.handle}) · ${c.sourcePlatform}`,
        `Followers: ${c.followerCount} · Products: ${c.productCount} · Est rev: $${c.totalEstRevenueUsd}`,
        `Niches: ${c.niches.join(", ")}`,
        p ? `Cadence: ${p.postingCadence}` : "",
        p ? `Tiers: ${p.pricingTiers.map((t) => `${t.label} $${t.priceUsd}`).join(" / ")}` : "",
        p ? `Funnels: ${p.funnels.join(" | ")}` : "",
        p ? `Signature: ${p.signatureStyle}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function datasetContext(ids: string[]) {
  return ids
    .map((id) => {
      const a = findResellable(id);
      if (!a) return `Asset '${id}' not found.`;
      return [
        `RESELLABLE ${a.id} (${a.assetType})`,
        `Title: ${a.title}`,
        `License: ${a.license ?? "—"}`,
        `Asking: ${a.askingPriceUsd ? `$${a.askingPriceUsd}` : "—"} · MRR: ${a.monthlyRevenueUsd ? `$${a.monthlyRevenueUsd}` : "—"}`,
        `Status: ${a.status}`,
        `Notes: ${a.notes}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function assembleContext({
  mode,
  refIds = {},
  userId,
  tokenBudget = 8000,
}: AssembleArgs): string {
  const sections: string[] = [PERSISTENT_IDENTITY, "", MODE_PROMPTS[mode]];

  sections.push("", "GOLDEN RULES (active):", rulesBlock());
  sections.push("", "FEEDBACK PATTERNS:", patternsBlock());
  sections.push("", "RECENT USER DECISIONS:", recentDecisions(userId));

  switch (mode) {
    case "global":
      sections.push("", globalContext());
      break;
    case "niche":
      sections.push("", nicheContext(refIds.niches ?? []));
      break;
    case "opportunity":
    case "build_plan":
      sections.push("", opportunityContext(refIds.opportunityIds ?? []));
      break;
    case "creator":
      sections.push("", creatorContext(refIds.creatorIds ?? []));
      break;
    case "replicate":
      sections.push("", opportunityContext(refIds.opportunityIds ?? []));
      sections.push("", "Reference products: " + (refIds.productIds ?? []).join(", "));
      break;
    case "dataset_review":
      sections.push("", datasetContext(refIds.assetIds ?? []));
      break;
  }

  return fitToBudget(sections.join("\n"), tokenBudget);
}
