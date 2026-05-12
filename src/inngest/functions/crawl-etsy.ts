import { inngest } from "../client";
import etsy from "@/lib/crawlers/etsy";
import { persistSignals } from "./_persist-signals";

export const crawlEtsy = inngest.createFunction(
  { id: "crawl-etsy", name: "Crawl Etsy", retries: 3, concurrency: { limit: 1 } },
  { cron: "30 */6 * * *" },
  async ({ step, logger }) => {
    const raw        = await step.run("crawl",     () => etsy.crawl({ config: { limit: 50 } }));
    const parsed     = await step.run("parse",     () => etsy.parse(raw));
    const normalized = await step.run("normalize", () => etsy.normalize(parsed));
    const saved      = await step.run("persist",   () => persistSignals(normalized));
    logger.info(`[crawl-etsy] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);