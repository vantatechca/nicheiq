import { inngest } from "../client";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  opportunities,
  signals,
  nicheEnum,
  opportunityTypeEnum,
  buildEffortEnum,
} from "@/lib/db/schema";
import { selectModel, estimateCostUsd, reserveSpend, recordActualSpend } from "@/lib/ai/client";
import { and, desc, eq, gt, sql } from "drizzle-orm";

type NicheGroup = {
  niche: string;
  count: number;
  topSignals: Array<{ id: string; title: string; score: number }>;
};

// Per-proposal estimate. Up to 6 proposals at ~$0.005 each on Haiku.
// Reserve total up front so the cap fires before we burn money on a partial run.
const ESTIMATE_PER_PROPOSAL_USD = 0.01;
const MAX_PROPOSALS = 6;

// Zod schema for the model's output. Anything that doesn't match is dropped.
const proposalSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(1000),
  opportunityType: z.enum(opportunityTypeEnum.enumValues),
  buildEffort: z.enum(buildEffortEnum.enumValues),
  projectedRevenueUsd: z.number().nonnegative().max(1_000_000),
  aiRationale: z.string().min(10).max(2000),
  aiBuildPlan: z
    .object({
      weeks: z.array(z.object({ label: z.string(), deliverables: z.array(z.string()) })).optional(),
      stack: z.array(z.string()).optional(),
      monetization: z.array(z.string()).optional(),
      risks: z.array(z.string()).optional(),
      successMetrics: z.array(z.string()).optional(),
    })
    .passthrough(),
  score: z.number().min(0).max(100),
  scoreBreakdown: z.record(z.number()).default({}),
});

function stripJsonFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export const synthesizeOpportunities = inngest.createFunction(
  { id: "synthesize-opportunities", retries: 1 },
  { cron: "0 */4 * * *" },
  async ({ step, logger }) => {
    // Step 1: niche groups from recent signals.
    const nicheGroups = await step.run("fetch-signals-by-niche", async () => {
      const db = getDb();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const nicheCounts = await db
        .select({
          niche: signals.niche,
          count: sql<number>`count(*)::int`,
        })
        .from(signals)
        .where(gt(signals.processedAt, since))
        .groupBy(signals.niche)
        .orderBy(desc(sql`count(*)`))
        .limit(8);

      const groups: NicheGroup[] = [];
      for (const { niche, count } of nicheCounts) {
        if (niche === "other" && count < 20) continue;
        const topSignals = await db
          .select({ id: signals.id, title: signals.title, score: signals.score })
          .from(signals)
          .where(and(gt(signals.processedAt, since), eq(signals.niche, niche)))
          .orderBy(desc(signals.score))
          .limit(15);
        groups.push({ niche, count, topSignals });
      }
      logger.info(`[synthesize] ${groups.length} niche groups`);
      return groups;
    });

    if (!nicheGroups.length) {
      logger.info("[synthesize] no signal groups — skipping");
      return { proposed: 0 };
    }

    // Step 2: reserve spend for the whole batch.
    const batchSize = Math.min(MAX_PROPOSALS, nicheGroups.length);
    const reserveTotal = ESTIMATE_PER_PROPOSAL_USD * batchSize;
    const cap = await step.run("check-spend-cap", async () => reserveSpend(reserveTotal));
    if (!cap.allowed) {
      logger.warn(`[synthesize] spend cap reached (need $${reserveTotal.toFixed(3)})`);
      return { proposed: 0, reason: "spend_cap" };
    }

    // Step 3: propose. Track actual spend across calls so we reconcile precisely.
    const proposals = await step.run("ai-propose-by-niche", async () => {
      const tier2 = selectModel({ tier: 2 });
      const accepted: Array<
        z.infer<typeof proposalSchema> & { niche: string; sourceSignalIds: string[] }
      > = [];
      let actualUsd = 0;

      try {
        for (const group of nicheGroups.slice(0, MAX_PROPOSALS)) {
          try {
            const signalList = group.topSignals
              .slice(0, 8)
              .map((s, i) => `${i + 1}. "${s.title}" (score: ${s.score})`)
              .join("\n");

            const result = await tier2.complete({
              system: `You are a sharp digital product market analyst. Propose one concrete digital product opportunity in the ${group.niche.replace(/_/g, " ")} niche. Output ONLY valid JSON, no markdown.`,
              messages: [
                {
                  role: "user",
                  content: `Niche: ${group.niche.replace(/_/g, " ")}
Signal count today: ${group.count}
Top signals:
${signalList}

Propose a specific digital product. Output strictly this JSON shape:
{
  "title": "specific product title (max 60 chars)",
  "summary": "2-sentence opportunity summary",
  "opportunityType": "trend_play|replication|repackage_resell|niche_expansion|micro_saas|plr_remix|dataset_wrap",
  "buildEffort": "weekend|week|month|quarter|year_plus",
  "projectedRevenueUsd": 1500,
  "aiRationale": "3-4 sentence rationale referencing the signals",
  "aiBuildPlan": {
    "weeks": [{"label": "Week 1", "deliverables": ["..."]}],
    "stack": ["tool1"],
    "monetization": ["strategy1"],
    "risks": ["risk1"],
    "successMetrics": ["metric1"]
  },
  "score": 72,
  "scoreBreakdown": {"demandSignal": 18, "competition": 15, "monetisation": 16, "timeToMarket": 14, "creatorFit": 9}
}`,
                },
              ],
              maxTokens: 1000,
              temperature: 0.4,
            });

            if (result.usage) actualUsd += estimateCostUsd(2, result.usage);

            const parsed = JSON.parse(stripJsonFences(result.text));
            const safe = proposalSchema.safeParse(parsed);
            if (!safe.success) {
              logger.warn(
                `[synthesize] proposal invalid for ${group.niche}: ${safe.error.message}`,
              );
              continue;
            }
            accepted.push({
              ...safe.data,
              niche: group.niche,
              sourceSignalIds: group.topSignals.map((s) => s.id),
            });
          } catch (err) {
            logger.warn(
              `[synthesize] proposal failed for niche ${group.niche}: ${(err as Error).message}`,
            );
          }
        }
      } finally {
        await recordActualSpend(reserveTotal, actualUsd);
      }

      return accepted;
    });

    logger.info(`[synthesize] ${proposals.length} valid proposals`);
    if (!proposals.length) return { proposed: 0 };

    // Step 4: persist. Niche/type/effort are validated upstream by Zod, so the
    // enum casts here are safe (no more "best guess" strings reaching the DB).
    const saved = await step.run("persist-opportunities", async () => {
      const db = getDb();
      const rows = proposals.map((p) => ({
        id: crypto.randomUUID(),
        title: p.title,
        summary: p.summary,
        niche: p.niche as (typeof nicheEnum.enumValues)[number],
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

      const result = await db.insert(opportunities).values(rows).onConflictDoNothing();
      return result.rowCount ?? 0;
    });

    return { nicheGroups: nicheGroups.length, proposed: proposals.length, saved };
  },
);