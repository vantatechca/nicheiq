import { inngest } from "../client";
import envato from "@/lib/crawlers/envato";
import { persistSignals } from "./_persist-signals";

/**
 * Crawl Envato Market (GraphicRiver / ThemeForest / CodeCanyon) for digital
 * asset listings, then persist them.
 *
 * IMPORTANT: the entire crawl→parse→normalize→persist runs inside ONE step.
 * Inngest caps the serialized output of each step, and the normalized array
 * (3 sites × 2 sorts × up to 30 rows) exceeds that cap when passed between
 * steps. Keeping it all in a single step means only the small summary object
 * ({ count, saved }) ever crosses a step boundary — the big array stays in
 * memory and is never serialized. The trade-off is that a mid-pipeline failure
 * re-runs the whole step rather than resuming, which is fine for a short crawl.
 *
 * 12h cadence (Envato has low listing velocity); 45m past the hour separates it
 * from crawl-product-hunt (also 12h).
 */
export const crawlEnvato = inngest.createFunction(
  { id: "crawl-envato", name: "Crawl Envato", retries: 3, concurrency: { limit: 1 } },
  { cron: "45 */12 * * *" },
  async ({ step, logger }) => {
    const { count, saved } = await step.run("crawl-and-persist", async () => {
      const raw = await envato.crawl({ config: {} }); // defaults: 3 sites × trending+sales
      const parsed = envato.parse(raw);
      const normalized = envato.normalize(parsed);
      const savedCount = await persistSignals(normalized);
      return { count: normalized.length, saved: savedCount };
    });

    logger.info(`[crawl-envato] ${count} signals, ${saved} saved`);
    return { count, saved };
  },
);