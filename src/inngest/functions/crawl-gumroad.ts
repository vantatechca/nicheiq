import { inngest } from "../client";
import gumroad from "@/lib/crawlers/gumroad";
import { persistSignals } from "./_persist-signals";

/**
 * Crawl Gumroad marketplace listings for digital product niches.
 *
 * Cron is offset 10 minutes past the hour to avoid colliding with the
 * other 6h crawlers (crawl-etsy fires at :30, crawl-hacker-news fires
 * at :00). Concurrency is capped at 1 so a slow run can't pile up — the
 * next tick waits its turn rather than starting a parallel crawl.
 */
export const crawlGumroad = inngest.createFunction(
  { id: "crawl-gumroad", name: "Crawl Gumroad", retries: 3, concurrency: { limit: 1 } },
  { cron: "10 */6 * * *" },
  async ({ step, logger }) => {
    const raw = await step.run("crawl", () => gumroad.crawl({ config: { limit: 50 } }));
    const parsed = await step.run("parse", () => gumroad.parse(raw));
    const normalized = await step.run("normalize", () => gumroad.normalize(parsed));
    const saved = await step.run("persist", () => persistSignals(normalized));
    logger.info(`[crawl-gumroad] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);
