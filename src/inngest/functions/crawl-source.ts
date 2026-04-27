import { inngest } from "../client";

/**
 * crawl.source — runs one source crawler. Triggered by cron or manual `crawl/source.requested` event.
 * Phase I will plug in real crawler modules from src/lib/crawlers/<source>.ts.
 */
export const crawlSource = inngest.createFunction(
  { id: "crawl-source", retries: 3, concurrency: { limit: 5 } },
  { event: "crawl/source.requested" },
  async ({ event, step }) => {
    const { sourceId } = event.data;

    const job = await step.run("create-job-record", async () => ({
      id: `job_${Date.now()}`,
      sourceId,
      status: "running" as const,
      startedAt: new Date().toISOString(),
    }));

    const items = await step.run("fetch-items", async () => {
      // Phase I: dispatch to per-source crawler module.
      return { itemsFound: 0, itemsNew: 0, sample: [] as unknown[] };
    });

    await step.run("persist-and-emit-enrichments", async () => {
      // Phase H: upsert into products + signals + emit product/enrich.requested events
      return { upserted: items.itemsNew };
    });

    return { jobId: job.id, itemsFound: items.itemsFound, itemsNew: items.itemsNew };
  },
);
