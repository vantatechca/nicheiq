import { inngest } from "../client";
import reddit from "@/lib/crawlers/reddit";
import { persistSignals } from "./_persist-signals";

export const crawlReddit = inngest.createFunction(
  { id: "crawl-reddit", name: "Crawl Reddit", retries: 3, concurrency: { limit: 1 } },
  { cron: "0 */4 * * *" },
  async ({ step, logger }) => {
    const raw = await step.run("crawl", () => reddit.crawl({ config: { limit: 25 } }));
    const parsed = await step.run("parse", () => reddit.parse(raw));
    const normalized = await step.run("normalize", () => reddit.normalize(parsed));
    const saved = await step.run("persist", () => persistSignals(normalized));
    logger.info(`[crawl-reddit] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);
