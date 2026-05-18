import { inngest } from "../client";
import envato from "@/lib/crawlers/envato";
import { persistSignals } from "./_persist-signals";

/**
 * Crawl Envato Market (Theme Forest / Code Canyon / Graphic River / etc.)
 * for new digital asset listings.
 *
 * Less velocity than Gumroad/Etsy so 12h is plenty. 45m past the hour
 * separates it cleanly from crawl-product-hunt (also 12h).
 */
export const crawlEnvato = inngest.createFunction(
  { id: "crawl-envato", name: "Crawl Envato", retries: 3, concurrency: { limit: 1 } },
  { cron: "45 */12 * * *" },
  async ({ step, logger }) => {
    const raw = await step.run("crawl", () => envato.crawl({ config: { limit: 40 } }));
    const parsed = await step.run("parse", () => envato.parse(raw));
    const normalized = await step.run("normalize", () => envato.normalize(parsed));
    const saved = await step.run("persist", () => persistSignals(normalized));
    logger.info(`[crawl-envato] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);
