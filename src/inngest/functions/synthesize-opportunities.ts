import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { signals, opportunities } from "@/lib/db/schema";
import { selectModel, reserveSpend } from "@/lib/ai/client";
import { desc, gt, eq, sql } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

type NicheValue =
  | "print_on_demand" | "etsy_printable" | "notion_template" | "gumroad_ebook"
  | "kdp_low_content" | "course" | "ai_prompt_pack" | "figma_kit"
  | "wordpress_theme" | "shopify_app" | "lightroom_preset" | "sample_pack"
  | "video_template" | "dataset" | "plr_pack" | "micro_saas"
  | "browser_extension" | "discord_bot" | "game_asset" | "other";

type OpportunityType =
  | "trend_play" | "replication" | "repackage_resell" | "niche_expansion"
  | "micro_saas" | "plr_remix" | "dataset_wrap";

type BuildEffort = "weekend" | "week" | "month" | "quarter" | "year_plus";

interface SignalCluster {
  theme: string;
  niche: NicheValue;
  signalIds: string[];
  signalTitles: string[];
  avgScore: number;
}

interface OpportunityProposal {
  title: string;
  summary: string;
  niche: NicheValue;
  opportunityType: OpportunityType;
  buildEffort: BuildEffort;
  projectedRevenueUsd: number;
  aiRationale: string;
  aiBuildPlan: Record<string, unknown>;
  score: number;
  scoreBreakdown: Record<string, number>;
  sourceSignalIds: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_NICHES = new Set<NicheValue>([
  "print_on_demand", "etsy_printable", "notion_template", "gumroad_ebook",
  "kdp_low_content", "course", "ai_prompt_pack", "figma_kit", "wordpress_theme",
  "shopify_app", "lightroom_preset", "sample_pack", "video_template", "dataset",
  "plr_pack", "micro_saas", "browser_extension", "discord_bot", "game_asset", "other",
]);

const VALID_OPP_TYPES = new Set<OpportunityType>([
  "trend_play", "replication", "repackage_resell", "niche_expansion",
  "micro_saas", "plr_remix", "dataset_wrap",
]);

const VALID_EFFORTS = new Set<BuildEffort>([
  "weekend", "week", "month", "quarter", "year_plus",
]);

function safeNiche(v: string): NicheValue {
  return VALID_NICHES.has(v as NicheValue) ? (v as NicheValue) : "other";
}

function safeOppType(v: string): OpportunityType {
  return VALID_OPP_TYPES.has(v as OpportunityType) ? (v as OpportunityType) : "trend_play";
}

function safeEffort(v: string): BuildEffort {
  return VALID_EFFORTS.has(v as BuildEffort) ? (v as BuildEffort) : "week";
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ── Step 1: cluster signals via Tier 1 (Qwen — cheap) ────────────────────────

async function clusterSignals(recentSignals: Array<{
  id: string;
  title: string;
  snippet: string;
  sourcePlatform: string;
  score: number;
}>): Promise<SignalCluster[]> {
  if (!recentSignals.length) return [];

  const tier1 = selectModel({ tier: 1 });

  const signalList = recentSignals
    .slice(0, 80) // cap to avoid token limits
    .map((s, i) => `${i + 1}. [${s.sourcePlatform}] "${s.title}" (score: ${s.score})`)
    .join("\n");

  const { text } = await tier1.complete({
    system: `You are a market intelligence analyst. Cluster these signals into 3-8 opportunity themes.
Output ONLY valid JSON array. No markdown fences. No preamble.`,
    messages: [
      {
        role: "user",
        content: `Signals:
${signalList}

Output a JSON array of clusters:
[
  {
    "theme": "short theme name",
    "niche": "one of: print_on_demand|etsy_printable|notion_template|gumroad_ebook|kdp_low_content|course|ai_prompt_pack|figma_kit|wordpress_theme|shopify_app|lightroom_preset|sample_pack|video_template|dataset|plr_pack|micro_saas|browser_extension|discord_bot|game_asset|other",
    "signalIndices": [1, 2, 5]
  }
]`,
      },
    ],
    maxTokens: 1500,
    temperature: 0.2,
  });

  const parsed = parseJson<Array<{
    theme: string;
    niche: string;
    signalIndices: number[];
  }>>(text, []);

  return parsed
    .filter((c) => c.signalIndices?.length >= 2)
    .map((c) => {
      const matched = c.signalIndices
        .map((i) => recentSignals[i - 1])
        .filter(Boolean) as typeof recentSignals;

      return {
        theme: c.theme,
        niche: safeNiche(c.niche),
        signalIds: matched.map((s) => s.id),
        signalTitles: matched.map((s) => s.title),
        avgScore: matched.reduce((a, s) => a + s.score, 0) / (matched.length || 1),
      };
    })
    .filter((c) => c.signalIds.length >= 2);
}

// ── Step 2: propose opportunity per cluster via Tier 2 (Haiku) ────────────────

async function proposeOpportunity(
  cluster: SignalCluster,
): Promise<OpportunityProposal | null> {
  const tier2 = selectModel({ tier: 2 });

  const { text } = await tier2.complete({
    system: `You are a sharp digital product market analyst. Propose one concrete digital product opportunity.
Output ONLY valid JSON. No markdown fences. No preamble.`,
    messages: [
      {
        role: "user",
        content: `Cluster theme: "${cluster.theme}"
Niche: ${cluster.niche}
Supporting signals (${cluster.signalIds.length}):
${cluster.signalTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join("\n")}
Average signal score: ${Math.round(cluster.avgScore)}

Propose a specific digital product opportunity. Output:
{
  "title": "specific product title (max 60 chars)",
  "summary": "2-sentence opportunity summary",
  "niche": "${cluster.niche}",
  "opportunityType": "trend_play|replication|repackage_resell|niche_expansion|micro_saas|plr_remix|dataset_wrap",
  "buildEffort": "weekend|week|month|quarter|year_plus",
  "projectedRevenueUsd": 1500,
  "aiRationale": "3-4 sentence rationale referencing the signals",
  "aiBuildPlan": {
    "phase1": "...",
    "phase2": "...",
    "phase3": "...",
    "tools": ["..."],
    "monetisation": "..."
  },
  "score": 72,
  "scoreBreakdown": {
    "demandSignal": 18,
    "competition": 15,
    "monetisation": 16,
    "timeToMarket": 14,
    "creatorFit": 9
  }
}`,
      },
    ],
    maxTokens: 1200,
    temperature: 0.4,
  });

  const parsed = parseJson<Partial<OpportunityProposal>>(text, {});
  if (!parsed.title || !parsed.summary) return null;

  return {
    title: parsed.title,
    summary: parsed.summary,
    niche: safeNiche(parsed.niche ?? cluster.niche),
    opportunityType: safeOppType(parsed.opportunityType ?? "trend_play"),
    buildEffort: safeEffort(parsed.buildEffort ?? "week"),
    projectedRevenueUsd: Number(parsed.projectedRevenueUsd ?? 500),
    aiRationale: parsed.aiRationale ?? "",
    aiBuildPlan: (parsed.aiBuildPlan as Record<string, unknown>) ?? {},
    score: Math.min(100, Math.max(0, Number(parsed.score ?? 50))),
    scoreBreakdown: (parsed.scoreBreakdown as Record<string, number>) ?? {},
    sourceSignalIds: cluster.signalIds,
  };
}

// ── Inngest function ──────────────────────────────────────────────────────────

export const synthesizeOpportunities = inngest.createFunction(
  { id: "synthesize-opportunities", retries: 1 },
  { cron: "0 */4 * * *" },
  async ({ step, logger }) => {

    // Step 1: fetch recent high-signal signals (last 24h, score > 0)
    const recentSignals = await step.run("fetch-recent-signals", async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return await getDb()
        .select({
          id: signals.id,
          title: signals.title,
          snippet: signals.snippet,
          sourcePlatform: signals.sourcePlatform,
          score: signals.score,
        })
        .from(signals)
        .where(gt(signals.processedAt, since))
        .orderBy(desc(signals.score))
        .limit(100);
    });

    logger.info(`[synthesize] ${recentSignals.length} recent signals`);

    if (recentSignals.length < 5) {
      logger.info("[synthesize] not enough signals — skipping");
      return { clusters: 0, proposed: 0 };
    }

    // Step 2: check spend cap
    const spendCheck = await step.run("check-spend-cap", async () => {
      return await reserveSpend(0.15); // reserve $0.15 for this run
    });

    if (!spendCheck.allowed) {
      logger.warn("[synthesize] daily spend cap reached — skipping");
      return { clusters: 0, proposed: 0, reason: "spend_cap" };
    }

    // Step 3: cluster signals with Tier 1
    const clusters = await step.run("cluster-signals", async () => {
      return await clusterSignals(recentSignals);
    });

    logger.info(`[synthesize] ${clusters.length} clusters formed`);
    if (!clusters.length) return { clusters: 0, proposed: 0 };

    // Step 4: propose one opportunity per cluster (Tier 2)
    const proposals = await step.run("ai-propose-opportunities", async () => {
      const results: OpportunityProposal[] = [];
      for (const cluster of clusters.slice(0, 6)) { // max 6 proposals per run
        const proposal = await proposeOpportunity(cluster);
        if (proposal) results.push(proposal);
      }
      return results;
    });

    logger.info(`[synthesize] ${proposals.length} proposals generated`);
    if (!proposals.length) return { clusters: clusters.length, proposed: 0 };

    // Step 5: persist to opportunities table
    const saved = await step.run("persist-opportunities", async () => {
      const rows = proposals.map((p) => ({
        id: crypto.randomUUID(),
        title: p.title,
        summary: p.summary,
        niche: p.niche,
        opportunityType: p.opportunityType,
        buildEffort: p.buildEffort,
        projectedRevenueUsd: p.projectedRevenueUsd,
        status: "tracking" as const,
        sourceProductIds: [] as string[],
        sourceSignalIds: p.sourceSignalIds,
        aiRationale: p.aiRationale,
        aiBuildPlan: p.aiBuildPlan,
        score: p.score,
        scoreBreakdown: p.scoreBreakdown,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await getDb()
        .insert(opportunities)
        .values(rows)
        .onConflictDoNothing();

      return result.rowCount ?? 0;
    });

    logger.info(`[synthesize] ${saved} opportunities saved`);
    return { clusters: clusters.length, proposed: proposals.length, saved };
  },
);