import { NextRequest } from "next/server";
import { desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities, signals, digests } from "@/lib/db/schema";
import { selectModel } from "@/lib/ai/client";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ── Fetch top opportunities (last 7 days) ──────────────────────────────────
  const topOpps = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      summary: opportunities.summary,
      niche: opportunities.niche,
      score: opportunities.score,
      projectedRevenueUsd: opportunities.projectedRevenueUsd,
      opportunityType: opportunities.opportunityType,
      buildEffort: opportunities.buildEffort,
    })
    .from(opportunities)
    .where(gt(opportunities.createdAt, since7d))
    .orderBy(desc(opportunities.score))
    .limit(10);

  // ── Fetch signal counts by platform (last 24h) ─────────────────────────────
  const signalStats = await db
    .select({
      platform: signals.sourcePlatform,
      count: sql<number>`count(*)::int`,
    })
    .from(signals)
    .where(gt(signals.processedAt, since24h))
    .groupBy(signals.sourcePlatform);

  const totalSignals = signalStats.reduce((a, s) => a + s.count, 0);

  // ── Generate AI summary with Tier 3 ───────────────────────────────────────
  let aiSummary = "";
  try {
    const tier3 = selectModel({ tier: 3 });
    const oppList = topOpps
      .slice(0, 6)
      .map(
        (o, i) =>
          `${i + 1}. "${o.title}" — ${o.niche.replace(/_/g, " ")} — score ${Math.round(o.score)} — $${Math.round(o.projectedRevenueUsd)}/mo projected`,
      )
      .join("\n");

    const platformList = signalStats
      .map((s) => `${s.platform}: ${s.count} signals`)
      .join(", ");

    const { text } = await tier3.complete({
      system: `You are a sharp digital product market analyst writing a concise daily digest for a solo founder. 
Be direct, specific, and actionable. No fluff. Max 4 sentences.`,
      messages: [
        {
          role: "user",
          content: `Write a daily digest summary based on this data:

Top opportunities today:
${oppList || "No new opportunities scored today."}

Signal activity (last 24h): ${totalSignals} total signals — ${platformList || "none"}

Write 3-4 sentences covering: what's trending, the top opportunity to act on, and one insight.`,
        },
      ],
      maxTokens: 300,
      temperature: 0.5,
    });
    aiSummary = text.trim();
  } catch {
    aiSummary = topOpps.length
      ? `${topOpps.length} new opportunities scored today. Top pick: "${topOpps[0]?.title}" in ${topOpps[0]?.niche.replace(/_/g, " ")} with a score of ${Math.round(topOpps[0]?.score ?? 0)}. ${totalSignals} signals ingested across ${signalStats.length} platforms in the last 24h.`
      : `${totalSignals} signals ingested today across ${signalStats.length} platforms. No new opportunities synthesized yet — check back in a few hours.`;
  }

  // ── Persist digest ─────────────────────────────────────────────────────────
  const digestId = crypto.randomUUID();
  const now = new Date();
  const digest = {
    id: digestId,
    cadence: "on_demand" as const,
    periodStart: since24h,
    periodEnd: now,
    topOpportunityIds: topOpps.map((o) => o.id),
    risingNiches: [...new Set(topOpps.map((o) => o.niche))],
    topProducts: topOpps.slice(0, 5).map((o) => ({
      id: o.id,
      title: o.title,
      revenue: o.projectedRevenueUsd,
    })),
    aiSummary,
    sentTo: [] as string[],
    createdAt: now,
  };

  await db.insert(digests).values(digest).onConflictDoNothing();

  return ok({
    digest: { ...digest, periodStart: digest.periodStart.toISOString(), periodEnd: digest.periodEnd.toISOString(), createdAt: digest.createdAt.toISOString() },
    history: 1,
  });
}
export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const cadence = req.nextUrl.searchParams.get("cadence") ?? "daily";
  const db = getDb();

  const rows = await db
    .select()
    .from(digests)
    .where(eq(digests.cadence, cadence as typeof digests.cadence.enumValues[number]))
    .orderBy(desc(digests.createdAt))
    .limit(10);

  return ok({ digests: rows });
}