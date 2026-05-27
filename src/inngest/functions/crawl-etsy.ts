import { inngest } from "../client";
import etsy from "@/lib/crawlers/etsy";
import { persistSignals } from "./_persist-signals";

/**
 * Crawl Etsy (via the licensed automation-lab~etsy-scraper Apify actor) for
 * digital-product listings, then persist them.
 *
 * Like crawl-envato, the entire crawl→parse→normalize→persist runs inside ONE
 * step. The normalized array (up to ~10 keywords × 50 rows) exceeds Inngest's
 * per-step serialized-output cap if passed between steps, so we keep it in
 * memory and only the small summary object ({ count, saved }) crosses a step
 * boundary. Trade-off: a mid-pipeline failure re-runs the whole step rather
 * than resuming — fine for a short crawl.
 *
 * 6h cadence at :30 past the hour (separated from the other crawlers).
 * COST NOTE: every run calls the PAID Apify actor once per keyword. Tune the
 * cron and config.limit to control Apify spend — daily may be plenty to start.
 */
export const crawlEtsy = inngest.createFunction(
  { id: "crawl-etsy", name: "Crawl Etsy", retries: 3, concurrency: { limit: 1 } },
  { cron: "30 */6 * * *" },
  async ({ step, logger }) => {
    const { count, saved } = await step.run("crawl-and-persist", async () => {
      const raw = await etsy.crawl({ config: { limit: 50 } }); // defaults: digital keywords
      const parsed = etsy.parse(raw);
      const normalized = etsy.normalize(parsed);
      const savedCount = await persistSignals(normalized);
      return { count: normalized.length, saved: savedCount };
    });
    logger.info(`[crawl-etsy] ${count} signals, ${saved} saved`);
    return { count, saved };
  },
);