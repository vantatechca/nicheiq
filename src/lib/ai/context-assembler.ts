import { avg, count, desc, eq, inArray, sql } from "drizzle-orm";
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
import { getDb } from "@/lib/db/client";
import {
  goldenRules,
  feedbackPatterns,
  niches,
  creators,
  trends,
  opportunities,
  resellableAssets,
  opportunityVotes,
} from "@/lib/db/schema";
import { isMockMode } from "@/lib/repos/mode";
import type { ScoreBreakdown, CreatorPlaybook } from "@/lib/types";
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
const MAX_NICHE_OPPS = 6;
const MAX_NICHE_CREATORS = 4;
const MAX_RISING = 5;
const APPROX_CHARS_PER_TOKEN = 4;

type NicheSlug = (typeof niches.slug.enumValues)[number];

// ── Source-agnostic shapes the formatters consume ─────────────────────────────
// Both the mock fixtures and live DB rows are mapped into these by the gather*
// layer, so the formatting below has exactly one code path regardless of source.

interface RuleLite {
  ruleType: string;
  weight: number;
  label: string;
  keywords: string[];
}
interface PatternLite {
  derivedFrom: string;
  label: string;
  confidence: number;
}
interface DecisionLite {
  action: string;
  entityType: string;
  entityId: string;
}
interface OppBrief {
  id: string;
  score: number;
  title: string;
  summary: string;
}
interface RisingNicheLite {
  label: string;
  momentumScore: number;
  opportunityCount: number;
}
interface NicheBundleLite {
  slug: string;
  found: boolean;
  label: string;
  description: string;
  momentumScore: number;
  opps: { id: string; score: number; title: string }[];
  creators: { id: string; displayName: string; handle: string; totalEstRevenueUsd: number }[];
}
interface OppDetailLite {
  found: boolean;
  id: string;
  score: number;
  status: string;
  buildEffort: string;
  title: string;
  summary: string;
  niche: string;
  opportunityType: string;
  dims: ScoreBreakdown["dimensions"];
  aiRationale: string;
  sourceProductIds: string[];
  sourceSignalIds: string[];
}
interface CreatorDetailLite {
  found: boolean;
  id: string;
  displayName: string;
  handle: string;
  sourcePlatform: string;
  followerCount: number | null;
  productCount: number;
  totalEstRevenueUsd: number;
  niches: string[];
  playbook: CreatorPlaybook | null;
}
interface AssetDetailLite {
  found: boolean;
  id: string;
  assetType: string;
  title: string;
  license: string | null;
  askingPriceUsd: number | null;
  monthlyRevenueUsd: number | null;
  status: string;
  notes: string;
}

// ── Pure formatters (identical output for mock + live) ────────────────────────

function fitToBudget(text: string, tokenBudget: number) {
  const max = tokenBudget * APPROX_CHARS_PER_TOKEN;
  if (text.length <= max) return text;
  return text.slice(0, max - 80) + "\n…[truncated to fit token budget]";
}

function rulesBlock(rules: RuleLite[]) {
  return rules
    .map(
      (r) =>
        `- [${r.ruleType.toUpperCase()} w=${r.weight}] ${r.label}: ${r.keywords.join(", ") || "(no kw)"}`,
    )
    .join("\n");
}

function patternsBlock(patterns: PatternLite[]) {
  return patterns
    .map((p) => `- [${p.derivedFrom}] ${p.label} (conf ${(p.confidence * 100).toFixed(0)}%)`)
    .join("\n");
}

function decisionsBlock(decisions: DecisionLite[]) {
  return decisions.map((a) => `- ${a.action} ${a.entityType} (${a.entityId})`).join("\n");
}

function globalBlock(top: OppBrief[], rising: RisingNicheLite[]) {
  return [
    "TOP OPPORTUNITIES:",
    top.map((o) => `- ${o.id} [score ${o.score}] ${o.title} — ${o.summary}`).join("\n"),
    "\nRISING NICHES:",
    rising
      .map((n) => `- ${n.label} (mom ${n.momentumScore}, ${n.opportunityCount} opps)`)
      .join("\n"),
  ].join("\n");
}

function nicheBlock(bundles: NicheBundleLite[]) {
  return bundles
    .map((b) => {
      if (!b.found) return `Niche '${b.slug}' not found.`;
      return [
        `NICHE ${b.label} (${b.slug}) · momentum ${b.momentumScore}`,
        b.description,
        "OPPS:",
        b.opps.map((o) => `- ${o.id} [${o.score}] ${o.title}`).join("\n"),
        "CREATORS:",
        b.creators
          .map((c) => `- ${c.id} ${c.displayName} (${c.handle}) · est rev ${c.totalEstRevenueUsd}`)
          .join("\n"),
      ].join("\n");
    })
    .join("\n\n");
}

function opportunityBlock(items: OppDetailLite[]) {
  return items
    .map((o) => {
      if (!o.found) return `Opportunity '${o.id}' not found.`;
      const sb = o.dims;
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

function creatorBlock(items: CreatorDetailLite[]) {
  return items
    .map((c) => {
      if (!c.found) return `Creator '${c.id}' not found.`;
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

function datasetBlock(items: AssetDetailLite[]) {
  return items
    .map((a) => {
      if (!a.found) return `Asset '${a.id}' not found.`;
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

// ── Data acquisition (mock fixtures OR live Postgres) ─────────────────────────
// Every gather* function mirrors the repos pattern: a mock branch that
// reproduces the previous fixture selection exactly (so mock-mode output is
// unchanged) and a live branch that reads the database.

async function gatherRules(): Promise<RuleLite[]> {
  if (isMockMode()) {
    return mockGoldenRules
      .filter((r) => r.active)
      .slice(0, MAX_RULES)
      .map((r) => ({
        ruleType: r.ruleType,
        weight: r.weight,
        label: r.label,
        keywords: r.keywords,
      }));
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(goldenRules)
    .where(eq(goldenRules.active, true))
    .limit(MAX_RULES);
  return rows.map((r) => ({
    ruleType: r.ruleType,
    weight: r.weight,
    label: r.label,
    keywords: r.keywords,
  }));
}

async function gatherPatterns(): Promise<PatternLite[]> {
  if (isMockMode()) {
    return mockFeedbackPatterns
      .slice(0, MAX_PATTERNS)
      .map((p) => ({ derivedFrom: p.derivedFrom, label: p.label, confidence: p.confidence }));
  }
  const db = getDb();
  const rows = await db.select().from(feedbackPatterns).limit(MAX_PATTERNS);
  return rows.map((p) => ({
    derivedFrom: p.derivedFrom,
    label: p.label,
    confidence: p.confidence,
  }));
}

async function gatherDecisions(userId: string): Promise<DecisionLite[]> {
  if (isMockMode()) {
    return mockActivity
      .filter((a) => a.userId === userId)
      .slice(0, MAX_DECISIONS)
      .map((a) => ({ action: a.action, entityType: a.entityType, entityId: a.entityId }));
  }
  // No `activity` table in the live schema. The closest real record of a user
  // decision is their opportunity votes — surface those instead.
  const db = getDb();
  const rows = await db
    .select({
      direction: opportunityVotes.direction,
      oppId: opportunityVotes.opportunityId,
      title: opportunities.title,
    })
    .from(opportunityVotes)
    .innerJoin(opportunities, eq(opportunityVotes.opportunityId, opportunities.id))
    .where(eq(opportunityVotes.userId, userId))
    .orderBy(desc(opportunityVotes.createdAt))
    .limit(MAX_DECISIONS);
  return rows.map((r) => ({
    action: `voted ${r.direction}`,
    entityType: `opportunity "${r.title}"`,
    entityId: r.oppId,
  }));
}

async function gatherGlobal(): Promise<{ top: OppBrief[]; rising: RisingNicheLite[] }> {
  if (isMockMode()) {
    const top = mockOpportunities
      .slice(0, MAX_OPPS_GLOBAL)
      .map((o) => ({ id: o.id, score: o.score, title: o.title, summary: o.summary }));
    const rising = [...mockNiches]
      .sort((a, b) => b.momentumScore - a.momentumScore)
      .slice(0, MAX_RISING)
      .map((n) => ({
        label: n.label,
        momentumScore: n.momentumScore,
        opportunityCount: n.opportunityCount,
      }));
    return { top, rising };
  }

  const db = getDb();
  // momentumScore and opportunityCount are derived in mock; in live mode we
  // compute them from real data — momentum from the trends table (avg per
  // niche), counts from the opportunities table.
  const [topRows, nicheRows, momRows, cntRows] = await Promise.all([
    db
      .select()
      .from(opportunities)
      .orderBy(desc(opportunities.score), desc(opportunities.createdAt))
      .limit(MAX_OPPS_GLOBAL),
    db.select({ slug: niches.slug, label: niches.label }).from(niches),
    db
      .select({ niche: trends.niche, mom: avg(trends.momentumScore) })
      .from(trends)
      .groupBy(trends.niche),
    db
      .select({ niche: opportunities.niche, cnt: count() })
      .from(opportunities)
      .groupBy(opportunities.niche),
  ]);

  const momMap = new Map(momRows.map((r) => [r.niche, Number(r.mom ?? 0)]));
  const cntMap = new Map(cntRows.map((r) => [r.niche, Number(r.cnt ?? 0)]));

  const top: OppBrief[] = topRows.map((o) => ({
    id: o.id,
    score: o.score,
    title: o.title,
    summary: o.summary,
  }));
  const rising: RisingNicheLite[] = nicheRows
    .map((n) => ({
      label: n.label,
      momentumScore: Math.round(momMap.get(n.slug) ?? 0),
      opportunityCount: cntMap.get(n.slug) ?? 0,
    }))
    .sort((a, b) => b.momentumScore - a.momentumScore)
    .slice(0, MAX_RISING);

  return { top, rising };
}

async function gatherNicheBundles(slugs: string[]): Promise<NicheBundleLite[]> {
  if (isMockMode()) {
    return slugs.map((slug) => {
      const n = findNiche(slug);
      if (!n) {
        return {
          slug,
          found: false,
          label: "",
          description: "",
          momentumScore: 0,
          opps: [],
          creators: [],
        };
      }
      return {
        slug,
        found: true,
        label: n.label,
        description: n.description,
        momentumScore: n.momentumScore,
        opps: mockOpportunities
          .filter((o) => o.niche === slug)
          .slice(0, MAX_NICHE_OPPS)
          .map((o) => ({ id: o.id, score: o.score, title: o.title })),
        creators: mockCreators
          .filter((c) => c.niches.includes(slug))
          .slice(0, MAX_NICHE_CREATORS)
          .map((c) => ({
            id: c.id,
            displayName: c.displayName,
            handle: c.handle,
            totalEstRevenueUsd: c.totalEstRevenueUsd,
          })),
      };
    });
  }

  const db = getDb();
  return Promise.all(
    slugs.map(async (slug): Promise<NicheBundleLite> => {
      const enumSlug = slug as NicheSlug;
      const [nicheRow, oppRows, creatorRows, momRows] = await Promise.all([
        db.select().from(niches).where(eq(niches.slug, enumSlug)).limit(1),
        db
          .select({ id: opportunities.id, score: opportunities.score, title: opportunities.title })
          .from(opportunities)
          .where(eq(opportunities.niche, enumSlug))
          .orderBy(desc(opportunities.score))
          .limit(MAX_NICHE_OPPS),
        db
          .select({
            id: creators.id,
            displayName: creators.displayName,
            handle: creators.handle,
            totalEstRevenueUsd: creators.totalEstRevenueUsd,
          })
          .from(creators)
          .where(sql`${creators.niches} @> ARRAY[${slug}]::text[]`)
          .limit(MAX_NICHE_CREATORS),
        db
          .select({ mom: avg(trends.momentumScore) })
          .from(trends)
          .where(eq(trends.niche, enumSlug)),
      ]);

      const n = nicheRow[0];
      if (!n) {
        return {
          slug,
          found: false,
          label: "",
          description: "",
          momentumScore: 0,
          opps: [],
          creators: [],
        };
      }
      return {
        slug,
        found: true,
        label: n.label,
        description: n.description,
        momentumScore: Math.round(Number(momRows[0]?.mom ?? 0)),
        opps: oppRows,
        creators: creatorRows,
      };
    }),
  );
}

async function gatherOpportunityDetails(ids: string[]): Promise<OppDetailLite[]> {
  const toLite = (o: {
    id: string;
    score: number;
    status: string;
    buildEffort: string;
    title: string;
    summary: string;
    niche: string;
    opportunityType: string;
    scoreBreakdown: unknown;
    aiRationale: string;
    sourceProductIds: string[];
    sourceSignalIds: string[];
  }): OppDetailLite => ({
    found: true,
    id: o.id,
    score: o.score,
    status: o.status,
    buildEffort: o.buildEffort,
    title: o.title,
    summary: o.summary,
    niche: o.niche,
    opportunityType: o.opportunityType,
    dims: (o.scoreBreakdown as ScoreBreakdown).dimensions,
    aiRationale: o.aiRationale,
    sourceProductIds: o.sourceProductIds,
    sourceSignalIds: o.sourceSignalIds,
  });
  const missing = (id: string): OppDetailLite => ({ found: false, id }) as unknown as OppDetailLite;

  if (isMockMode()) {
    return ids.map((id) => {
      const o = findOpportunity(id);
      return o ? toLite(o) : missing(id);
    });
  }
  const db = getDb();
  const rows = ids.length
    ? await db.select().from(opportunities).where(inArray(opportunities.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => {
    const o = byId.get(id);
    return o ? toLite(o) : missing(id);
  });
}

async function gatherCreatorDetails(ids: string[]): Promise<CreatorDetailLite[]> {
  const toLite = (c: {
    id: string;
    displayName: string;
    handle: string;
    sourcePlatform: string;
    followerCount: number | null;
    productCount: number;
    totalEstRevenueUsd: number;
    niches: string[];
    playbook?: unknown;
  }): CreatorDetailLite => ({
    found: true,
    id: c.id,
    displayName: c.displayName,
    handle: c.handle,
    sourcePlatform: c.sourcePlatform,
    followerCount: c.followerCount,
    productCount: c.productCount,
    totalEstRevenueUsd: c.totalEstRevenueUsd,
    niches: c.niches,
    playbook: (c.playbook as CreatorPlaybook | null) ?? null,
  });
  const missing = (id: string): CreatorDetailLite =>
    ({ found: false, id }) as unknown as CreatorDetailLite;

  if (isMockMode()) {
    return ids.map((id) => {
      const c = findCreator(id);
      return c ? toLite(c) : missing(id);
    });
  }
  const db = getDb();
  const rows = ids.length ? await db.select().from(creators).where(inArray(creators.id, ids)) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => {
    const c = byId.get(id);
    return c ? toLite(c) : missing(id);
  });
}

async function gatherAssetDetails(ids: string[]): Promise<AssetDetailLite[]> {
  const toLite = (a: {
    id: string;
    assetType: string;
    title: string;
    license: string | null;
    askingPriceUsd: number | null;
    monthlyRevenueUsd: number | null;
    status: string;
    notes: string;
  }): AssetDetailLite => ({
    found: true,
    id: a.id,
    assetType: a.assetType,
    title: a.title,
    license: a.license,
    askingPriceUsd: a.askingPriceUsd,
    monthlyRevenueUsd: a.monthlyRevenueUsd,
    status: a.status,
    notes: a.notes,
  });
  const missing = (id: string): AssetDetailLite =>
    ({ found: false, id }) as unknown as AssetDetailLite;

  if (isMockMode()) {
    return ids.map((id) => {
      const a = findResellable(id);
      return a ? toLite(a) : missing(id);
    });
  }
  const db = getDb();
  const rows = ids.length
    ? await db.select().from(resellableAssets).where(inArray(resellableAssets.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => {
    const a = byId.get(id);
    return a ? toLite(a) : missing(id);
  });
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function assembleContext({
  mode,
  refIds = {},
  userId,
  tokenBudget = 8000,
}: AssembleArgs): Promise<string> {
  const [rules, patterns, decisions] = await Promise.all([
    gatherRules(),
    gatherPatterns(),
    gatherDecisions(userId),
  ]);

  const sections: string[] = [PERSISTENT_IDENTITY, "", MODE_PROMPTS[mode]];
  sections.push("", "GOLDEN RULES (active):", rulesBlock(rules));
  sections.push("", "FEEDBACK PATTERNS:", patternsBlock(patterns));
  sections.push("", "RECENT USER DECISIONS:", decisionsBlock(decisions));

  switch (mode) {
    case "global": {
      const { top, rising } = await gatherGlobal();
      sections.push("", globalBlock(top, rising));
      break;
    }
    case "niche": {
      const bundles = await gatherNicheBundles(refIds.niches ?? []);
      sections.push("", nicheBlock(bundles));
      break;
    }
    case "opportunity":
    case "build_plan": {
      const items = await gatherOpportunityDetails(refIds.opportunityIds ?? []);
      sections.push("", opportunityBlock(items));
      break;
    }
    case "creator": {
      const items = await gatherCreatorDetails(refIds.creatorIds ?? []);
      sections.push("", creatorBlock(items));
      break;
    }
    case "replicate": {
      const items = await gatherOpportunityDetails(refIds.opportunityIds ?? []);
      sections.push("", opportunityBlock(items));
      sections.push("", "Reference products: " + (refIds.productIds ?? []).join(", "));
      break;
    }
    case "dataset_review": {
      const items = await gatherAssetDetails(refIds.assetIds ?? []);
      sections.push("", datasetBlock(items));
      break;
    }
  }

  return fitToBudget(sections.join("\n"), tokenBudget);
}