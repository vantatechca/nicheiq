import { inngest } from "../client";
import productHunt from "@/lib/crawlers/product-hunt";
import { persistSignals } from "./_persist-signals";

export const crawlProductHunt = inngest.createFunction(
  { id: "crawl-product-hunt", name: "Crawl Product Hunt", retries: 3, concurrency: { limit: 1 } },
  { cron: "0 */12 * * *" },
  async ({ step, logger }) => {
    const raw = await step.run("crawl", () => productHunt.crawl({ config: { daysBack: 7 } }));
    const parsed = await step.run("parse", () => productHunt.parse(raw));
    const normalized = await step.run("normalize", () => productHunt.normalize(parsed));
    const saved = await step.run("persist", () => persistSignals(normalized));
    logger.info(`[crawl-product-hunt] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);
