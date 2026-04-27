import { inngest } from "../client";

/** patterns.refresh — nightly, recompute feedback patterns from votes/saves/builds/abandons. */
export const refreshPatterns = inngest.createFunction(
  { id: "refresh-patterns" },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const aggregate = await step.run("aggregate-user-actions", async () => ({ users: 0, actions: 0 }));
    const derived = await step.run("derive-patterns", async () => ({ patterns: [] as unknown[] }));
    await step.run("persist-patterns", async () => derived);
    return { aggregate, derived: derived.patterns.length };
  },
);
