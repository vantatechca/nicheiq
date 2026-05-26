import { inngest } from "../client";
import { getCrawler } from "@/lib/crawlers/registry";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import type { RawSignal } from "@/lib/crawlers/types";
import { inferNiche } from "@/lib/crawlers/niche-classify";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// ── crawlSource function ──────────────────────────────────────────────────────

export const crawlSource = inngest.createFunction(
  { id: "crawl-source", retries: 3, concurrency: { limit: 5 } },
  { event: "crawl/source.requested" },
  async ({ event, step }) => {
    const {
      sourceId,
      platform,
      config = {},
    } = event.data as {
      sourceId?: string;
      platform?: string;
      config?: Record<string, unknown>;
    };

    const crawlerKey = platform ?? sourceId;

    const job = await step.run("create-job-record", async () => ({
      id: `job_${Date.now()}`,
      sourceId: crawlerKey,
      status: "running" as const,
      startedAt: new Date().toISOString(),
    }));

    // ── fetch-items ─────────────────────────────────────────────────────────
    const fetchResult = await step.run("fetch-items", async () => {
      if (!crawlerKey) return { itemsFound: 0, itemsNew: 0, signals: [] as RawSignal[] };

      const crawler = getCrawler(crawlerKey);
      if (!crawler) {
        console.log(`[debug] no crawler for: ${crawlerKey}`);
        return { itemsFound: 0, itemsNew: 0, signals: [] as RawSignal[] };
      }

      console.log(`[debug] crawler found: ${crawlerKey}, calling crawl()`);
      const raw = await crawler.crawl({ config });
      console.log(
        `[debug] raw type:`,
        typeof raw,
        Array.isArray(raw) ? `length=${(raw as unknown[]).length}` : "",
      );
      const parsed = crawler.parse(raw);
      console.log(`[debug] parsed length:`, parsed.length);
      const signals = crawler.normalize(parsed);
      console.log(`[debug] signals length:`, signals.length);

      return { itemsFound: signals.length, itemsNew: signals.length, signals };
    });

    // ── persist-and-emit-enrichments ────────────────────────────────────────
    const persistResult = await step.run("persist-and-emit-enrichments", async () => {
      const signals = fetchResult.signals as RawSignal[];
      if (signals.length === 0) return { upserted: 0 };

      const db = getDb();
      let upserted = 0;

      const BATCH = 50;
      for (let i = 0; i < signals.length; i += BATCH) {
        const batch = signals.slice(i, i + BATCH);

        const rows = batch.map((s) => ({
          // products.id is a plain text PK — generate a stable UUID per source URL
          id: randomUUID(),
          sourcePlatform: s.sourcePlatform,
          sourceUrl: s.sourceUrl,
          title: s.title,
          // products.creator is text (not an object)
          creator: s.creator?.handle ?? null,
          creatorId: s.creator?.profileUrl ?? null,
          priceUsd: s.priceUsd ?? null,
          ratingAvg: s.ratingAvg ?? null,
          ratingCount: s.ratingCount ?? null,
          estMonthlySalesLow: s.estMonthlySales?.low ?? null,
          estMonthlySalesHigh: s.estMonthlySales?.high ?? null,
          estMonthlyRevenueLow: s.estMonthlyRevenue?.low ?? null,
          estMonthlyRevenueHigh: s.estMonthlyRevenue?.high ?? null,
          // niche is NOT NULL — infer via the shared canonical classifier
          niche: inferNiche({ title: s.title, tags: s.tags, snippet: s.snippet, niche: s.niche }),
          tags: s.tags ?? [],
          thumbnailUrl: s.thumbnailUrl ?? null,
          rawJson: s.rawJson,
          // firstSeenAt / lastSeenAt — both default to now() on insert
        }));

        await db
          .insert(products)
          .values(rows as (typeof products.$inferInsert)[])
          .onConflictDoUpdate({
            // Unique index is on (source_platform, source_url)
            target: [products.sourcePlatform, products.sourceUrl],
            set: {
              title: sql`excluded.title`,
              priceUsd: sql`excluded.price_usd`,
              ratingAvg: sql`excluded.rating_avg`,
              ratingCount: sql`excluded.rating_count`,
              thumbnailUrl: sql`excluded.thumbnail_url`,
              tags: sql`excluded.tags`,
              estMonthlySalesLow: sql`excluded.est_monthly_sales_low`,
              estMonthlySalesHigh: sql`excluded.est_monthly_sales_high`,
              estMonthlyRevenueLow: sql`excluded.est_monthly_revenue_low`,
              estMonthlyRevenueHigh: sql`excluded.est_monthly_revenue_high`,
              // bump lastSeenAt on every re-crawl; firstSeenAt stays untouched
              lastSeenAt: sql`now()`,
            },
          });

        upserted += rows.length;
      }

      return { upserted };
    });

    return {
      jobId: job.id,
      itemsFound: fetchResult.itemsFound,
      itemsNew: persistResult.upserted,
    };
  },
);