import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { trends, signals } from "@/lib/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

type SeriesPoint = { date: string; value: number };

const WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * snapshot.trends — daily, append one time-series point per tracked keyword.
 *
 * Demand proxy is the count of signals captured for the keyword's niche that
 * UTC day. This keeps the page live without a paid Google Trends key (per
 * AGENTS.md: build credential-less sources first). When a real trend source is
 * wired, swap the value calc for its volume and leave the rest intact.
 *
 * Idempotent: a retry for the same UTC day overwrites that day's point rather
 * than appending a duplicate, so the cron is safe to re-run.
 */
export const snapshotTrends = inngest.createFunction(
  { id: "snapshot-trends", retries: 2 },
  { cron: "0 6 * * *" },
  async ({ step, logger }) => {
    const today = await step.run("snapshot-day", async () => {
      // Anchor to UTC midnight so the point lands on a stable calendar day.
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString();
    });

    const updated = await step.run("append-and-recompute", async () => {
      const db = getDb();
      const rows = await db.select().from(trends);
      if (rows.length === 0) return { keywords: 0 };

      const dayStart = new Date(today);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);

      // Signal counts per niche for today, in one grouped query.
      const counts = await db
        .select({ niche: signals.niche, count: sql<number>`count(*)::int` })
        .from(signals)
        .where(and(gte(signals.processedAt, dayStart), lt(signals.processedAt, dayEnd)))
        .groupBy(signals.niche);

      const countByNiche = new Map<string, number>();
      for (const c of counts) countByNiche.set(c.niche, c.count);

      let written = 0;
      for (const row of rows) {
        const prev = (row.series as SeriesPoint[]) ?? [];

        // Demand proxy: today's signal volume for this niche. Carry forward the
        // last value on a quiet day so the line doesn't crater to zero when no
        // signals were crawled.
        const lastValue = prev.length ? prev[prev.length - 1]!.value : 100;
        const todayCount = countByNiche.get(row.niche) ?? 0;
        const value = todayCount > 0 ? 100 + todayCount * 6 : lastValue;

        // Append (or overwrite today's point on a retry), then trim the window.
        const withoutToday = prev.filter((p) => p.date.slice(0, 10) !== today.slice(0, 10));
        const next = [...withoutToday, { date: today, value }].slice(-WINDOW_DAYS);

        const volume30d = next.reduce((a, p) => a + p.value, 0);
        const volume7d = next.slice(-7).reduce((a, p) => a + p.value, 0);

        // Growth: last point vs the point ~7 days ago (or the earliest we have).
        const ref = next.length > 7 ? next[next.length - 8]! : next[0]!;
        const growthPct = ref.value > 0 ? ((value - ref.value) / ref.value) * 100 : 0;

        // Momentum: recent 7-day average vs older average, scaled to 0-100.
        const recent = next.slice(-7);
        const older = next.slice(0, -7);
        const recentAvg = recent.reduce((a, p) => a + p.value, 0) / Math.max(1, recent.length);
        const olderAvg = older.length
          ? older.reduce((a, p) => a + p.value, 0) / older.length
          : recentAvg;
        const momentumScore = Math.max(
          0,
          Math.min(100, Math.round(50 + ((recentAvg - olderAvg) / Math.max(1, olderAvg)) * 100)),
        );

        await db
          .update(trends)
          .set({
            series: next,
            volume7d,
            volume30d,
            growthPct: Math.round(growthPct * 10) / 10,
            momentumScore,
            snapshotDate: dayStart,
          })
          .where(eq(trends.id, row.id));
        written += 1;
      }

      return { keywords: written };
    });

    logger.info(`snapshot-trends: extended ${updated.keywords} keywords through ${today}`);
    return updated;
  },
);
