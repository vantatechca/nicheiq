import { inngest } from "../client";

/** snapshot.trends — daily, capture momentum scores for time-series. */
export const snapshotTrends = inngest.createFunction(
  { id: "snapshot-trends" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    const snapshot = await step.run("fetch-trend-data", async () => ({ keywords: 0 }));
    await step.run("persist-snapshot", async () => snapshot);
    return snapshot;
  },
);
