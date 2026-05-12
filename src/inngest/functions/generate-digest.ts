import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { opportunities, signals, digests } from "@/lib/db/schema";
import { selectModel } from "@/lib/ai/client";
import { desc, gt, sql } from "drizzle-orm";

type Cadence = "daily" | "weekly";

async function buildAndPersistDigest(cadence: Cadence) {
  const db = getDb();
  const windowMs = cadence === "daily"
    ? 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);

  // Top opportunities
  const topOpps = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      niche: opportunities.niche,
      score: opportunities.score,
      projectedRevenueUsd: opportunities.projectedRevenueUsd,
    })
    .from(opportunities)
    .where(gt(opportunities.createdAt, since))
    .orderBy(desc(opportunities.score))
    .limit(10);

  // Signal stats
  const signalStats = await db
    .select({
      platform: signals.sourcePlatform,
      count: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(gt(signals.processedAt, since))
    .groupBy(signals.sourcePlatform);

  const totalSignals = signalStats.reduce((a, s) => a + s.count, 0);

  // AI summary
  let aiSummary = "";
  try {
    const tier3 = selectModel({ tier: 3 });
    const oppList = topOpps
      .slice(0, 6)
      .map((o, i) => `${i + 1}. "${o.title}" — score ${Math.round(o.score)}`)
      .join("\n");

    const { text } = await tier3.complete({
      system: `You are a sharp digital product market analyst writing a ${cadence} digest for a solo founder. Be direct and actionable. Max 4 sentences.`,
      messages: [
        {
          role: "user",
          content: `Top opportunities:\n${oppList || "None yet."}\n\nSignals: ${totalSignals} total across ${signalStats.length} platforms.\n\nWrite a ${cadence} digest summary.`,
        },
      ],
      maxTokens: 300,
      temperature: 0.5,
    });
    aiSummary = text.trim();
  } catch {
    aiSummary = `${cadence === "daily" ? "Daily" : "Weekly"} digest: ${topOpps.length} opportunities scored. ${totalSignals} signals ingested.`;
  }

  const now = new Date();
  await db.insert(digests).values({
    id: crypto.randomUUID(),
    cadence,
    periodStart: since,
    periodEnd: now,
    topOpportunityIds: topOpps.map((o) => o.id),
    risingNiches: [...new Set(topOpps.map((o) => o.niche))],
    topProducts: topOpps.slice(0, 5).map((o) => ({
      id: o.id,
      title: o.title,
      revenue: o.projectedRevenueUsd,
    })),
    aiSummary,
    sentTo: [],
    createdAt: now,
  });

  return { cadence, opportunities: topOpps.length, signals: totalSignals, aiSummary };
}

export const generateDigestDaily = inngest.createFunction(
  { id: "generate-digest-daily", retries: 1 },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    return await step.run("compose-and-persist", () => buildAndPersistDigest("daily"));
  },
);

export const generateDigestWeekly = inngest.createFunction(
  { id: "generate-digest-weekly", retries: 1 },
  { cron: "0 8 * * 1" },
  async ({ step }) => {
    return await step.run("compose-and-persist", () => buildAndPersistDigest("weekly"));
  },
);