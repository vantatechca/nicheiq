import { inngest } from "../client";

/** synthesize.opportunities — every 4h, cluster recent signals → propose new opportunities. */
export const synthesizeOpportunities = inngest.createFunction(
  { id: "synthesize-opportunities", retries: 1 },
  { cron: "0 */4 * * *" },
  async ({ step }) => {
    const cluster = await step.run("cluster-signals", async () => ({ clusters: [] as unknown[] }));
    const proposals = await step.run("ai-tier3-propose", async () => ({ count: 0, proposals: [] }));
    await step.run("persist-opportunities", async () => proposals);
    return { clusters: cluster.clusters.length, proposed: proposals.count };
  },
);
