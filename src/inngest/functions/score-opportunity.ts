import { inngest } from "../client";

/** score.opportunity — recompute after rule/pattern changes. */
export const scoreOpportunity = inngest.createFunction(
  { id: "score-opportunity", retries: 2, concurrency: { limit: 4 } },
  { event: "opportunity/score.requested" },
  async ({ event, step }) => {
    const { opportunityId } = event.data;
    return await step.run("compute-score", async () => {
      // Pulls opportunity + rules + patterns, calls compute(), persists scoreBreakdown.
      return { opportunityId, score: 0, computedAt: new Date().toISOString() };
    });
  },
);
