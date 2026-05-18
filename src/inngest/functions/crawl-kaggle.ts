import { inngest } from "../client";
import kaggle from "@/lib/crawlers/kaggle";
import { persistSignals } from "./_persist-signals";

/**
 * Crawl Kaggle for new datasets that could be repackaged into resellable
 * data products (the resellable_assets pipeline picks these up).
 *
 * Datasets are slow-moving compared to marketplace listings — daily is
 * enough. 3:15 UTC keeps it off-peak everywhere and away from synthesis
 * batches (which fire every 4h on the hour). Lower limit since each
 * dataset row carries more context per item than a marketplace listing.
 */
export const crawlKaggle = inngest.createFunction(
  { id: "crawl-kaggle", name: "Crawl Kaggle", retries: 3, concurrency: { limit: 1 } },
  { cron: "15 3 * * *" },
  async ({ step, logger }) => {
    const raw = await step.run("crawl", () => kaggle.crawl({ config: { limit: 25 } }));
    const parsed = await step.run("parse", () => kaggle.parse(raw));
    const normalized = await step.run("normalize", () => kaggle.normalize(parsed));
    const saved = await step.run("persist", () => persistSignals(normalized));
    logger.info(`[crawl-kaggle] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);
