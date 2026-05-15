import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { opportunities, signals } from "@/lib/db/schema";
import { selectModel } from "@/lib/ai/client";
import { and, desc, eq, gt, sql } from "drizzle-orm";

type NicheGroup = {
  niche: string;
  count: number;
  topSignals: Array<{ id: string; title: string; score: number }>;
};

export const synthesizeOpportunities = inngest.createFunction(
  { id: "synthesize-opportunities", retries: 1 },
  { cron: "0 */4 * * *" },
  async ({ step, logger }) => {
    // Step 1: fetch recent signals grouped by niche
    const nicheGroups = await step.run("fetch-signals-by-niche", async () => {
      const db = getDb();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get top niches by signal count
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

      // For each niche, get top signals
      const groups: NicheGroup[] = [];
      for (const { niche, count } of nicheCounts) {
        if (niche === "other" && count < 20) continue; // skip tiny other buckets

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

    // Step 2: check spend cap
    const spendCheck = await step.run("check-spend-cap", async () => {
      const { reserveSpend } = await import("@/lib/ai/client");
      return await reserveSpend(0.2);
    });

    if (!spendCheck.allowed) {
      logger.warn("[synthesize] spend cap reached");
      return { proposed: 0, reason: "spend_cap" };
    }

    // Step 3: propose one opportunity per niche group
    const proposals = await step.run("ai-propose-by-niche", async () => {
      const tier2 = selectModel({ tier: 2 });
      const results: Array<{
        title: string;
        summary: string;
        niche: string;
        opportunityType: string;
        buildEffort: string;
        projectedRevenueUsd: number;
        aiRationale: string;
        aiBuildPlan: Record<string, unknown>;
        score: number;
        scoreBreakdown: Record<string, number>;
        sourceSignalIds: string[];
      }> = [];

      for (const group of nicheGroups.slice(0, 6)) {
        try {
          const signalList = group.topSignals
            .slice(0, 8)
            .map((s, i) => `${i + 1}. "${s.title}" (score: ${s.score})`)
            .join("\n");

          const { text } = await tier2.complete({
            system: `You are a sharp digital product market analyst. Propose one concrete digital product opportunity in the ${group.niche.replace(/_/g, " ")} niche. Output ONLY valid JSON, no markdown.`,
            messages: [
              {
                role: "user",
                content: `Niche: ${group.niche.replace(/_/g, " ")}
Signal count today: ${group.count}
Top signals:
${signalList}

Propose a specific digital product. Output:
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
            maxTokens: 1000,
            temperature: 0.4,
          });

          const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/```\s*$/, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          if (!parsed.title || !parsed.summary) continue;

          results.push({
            title: parsed.title,
            summary: parsed.summary,
            niche: group.niche,
            opportunityType: parsed.opportunityType ?? "trend_play",
            buildEffort: parsed.buildEffort ?? "week",
            projectedRevenueUsd: Number(parsed.projectedRevenueUsd ?? 500),
            aiRationale: parsed.aiRationale ?? "",
            aiBuildPlan: parsed.aiBuildPlan ?? {},
            score: Math.min(100, Math.max(0, Number(parsed.score ?? 50))),
            scoreBreakdown: parsed.scoreBreakdown ?? {},
            sourceSignalIds: group.topSignals.map((s) => s.id),
          });
        } catch {
          logger.warn(`[synthesize] proposal failed for niche ${group.niche}`);
        }
      }

      return results;
    });

    logger.info(`[synthesize] ${proposals.length} proposals`);
    if (!proposals.length) return { proposed: 0 };

    // Step 4: persist
    const saved = await step.run("persist-opportunities", async () => {
      const db = getDb();
      const rows = proposals.map((p) => ({
        id: crypto.randomUUID(),
        title: p.title,
        summary: p.summary,
        niche: p.niche as (typeof opportunities.niche.enumValues)[number],
        opportunityType:
          p.opportunityType as (typeof opportunities.opportunityType.enumValues)[number],
        buildEffort: p.buildEffort as (typeof opportunities.buildEffort.enumValues)[number],
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
