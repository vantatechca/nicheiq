import { inngest } from "../client";
import hackerNews from "@/lib/crawlers/hacker-news";
import { persistSignals } from "./_persist-signals";

export const crawlHackerNews = inngest.createFunction(
  { id: "crawl-hacker-news", name: "Crawl Hacker News", retries: 3, concurrency: { limit: 1 } },
  { cron: "15 */6 * * *" },
  async ({ step, logger }) => {
    const raw = await step.run("crawl", () =>
      hackerNews.crawl({ config: { limit: 30, list: "showstories" } }),
    );
    const parsed = await step.run("parse", () => hackerNews.parse(raw));
    const normalized = await step.run("normalize", () => hackerNews.normalize(parsed));
    const saved = await step.run("persist", () => persistSignals(normalized));
    logger.info(`[crawl-hacker-news] ${normalized.length} signals, ${saved} saved`);
    return { count: normalized.length, saved };
  },
);
