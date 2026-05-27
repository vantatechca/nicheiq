import { inngest } from "../client";
import { getCrawler } from "@/lib/crawlers/registry";
import { getSource, recordSourceRun } from "@/lib/repos/sources";
import { persistSignals } from "./_persist-signals";

// ── crawlSource function ──────────────────────────────────────────────────────
//
// Handles the on-demand "Test crawl" event. Mirrors the cron crawlers
// (crawl-etsy / crawl-envato / …): resolve the platform, then crawl → parse →
// normalize → persistSignals inside ONE step. persistSignals routes each item
// to the right table (products for marketplace listings, signals for trend
// chatter) and classifies niches — so this no longer hand-rolls a products-only
// upsert, which mis-filed trend platforms (Reddit/HN/PH) into `products`.
//
// Keeping crawl+persist in a single step avoids passing the (potentially large)
// normalized array across an Inngest step boundary, which can exceed the
// per-step serialized-output cap.

export const crawlSource = inngest.createFunction(
  { id: "crawl-source", retries: 3, concurrency: { limit: 5 } },
  { event: "crawl/source.requested" },
  async ({ event, step }) => {
    const {
      sourceId,
      platform: platformInput,
      config: configInput,
    } = event.data as {
      sourceId?: string;
      platform?: string;
      config?: Record<string, unknown>;
    };

    // Resolve which crawler to run + its config. Prefer an explicit platform;
    // otherwise look it up from the source record. A sourceId is NOT a crawler
    // key, so we must never use it as one.
    const resolved = await step.run("resolve-source", async () => {
      if (platformInput) {
        return { platform: platformInput, config: configInput ?? {} };
      }
      if (sourceId) {
        const src = await getSource(sourceId);
        if (src) {
          return {
            platform: src.sourcePlatform as string,
            config: configInput ?? src.config ?? {},
          };
        }
      }
      return { platform: null as string | null, config: configInput ?? {} };
    });

    const crawlerKey = resolved.platform;
    const config = resolved.config;

    if (!crawlerKey) {
      console.log(`[crawl-source] could not resolve a platform (sourceId=${sourceId ?? "none"})`);
      if (sourceId) {
        await step.run("record-no-platform", () =>
          recordSourceRun(sourceId, { status: "error", error: "No crawler platform resolved" }),
        );
      }
      return { sourceId: sourceId ?? null, platform: null, itemsFound: 0, saved: 0, error: "no-platform" };
    }

    const result = await step.run("crawl-and-persist", async () => {
      const crawler = getCrawler(crawlerKey);
      if (!crawler) {
        const msg = `No crawler registered for "${crawlerKey}"`;
        console.log(`[crawl-source] ${msg}`);
        return { itemsFound: 0, saved: 0, error: msg };
      }

      try {
        const raw = await crawler.crawl({ config });
        const parsed = crawler.parse(raw);
        const signals = crawler.normalize(parsed);
        const savedCount = await persistSignals(signals);
        return { itemsFound: signals.length, saved: savedCount, error: null as string | null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Crawl failed";
        console.error(`[crawl-source] crawl failed for "${crawlerKey}": ${msg}`);
        return { itemsFound: 0, saved: 0, error: msg };
      }
    });

    // Write the outcome back to the source row so the dashboard reflects it.
    if (sourceId) {
      await step.run("record-run", () =>
        recordSourceRun(sourceId, {
          status: result.error ? "error" : "ok",
          itemsAdded: result.saved,
          error: result.error,
        }),
      );
    }

    return {
      sourceId: sourceId ?? null,
      platform: crawlerKey,
      itemsFound: result.itemsFound,
      saved: result.saved,
      error: result.error,
    };
  },
);