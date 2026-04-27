import { inngest } from "../client";

/** generate.digest — daily 8am, weekly Mon 8am. */
export const generateDigestDaily = inngest.createFunction(
  { id: "generate-digest-daily" },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    const synthesis = await step.run("ai-tier3-compose", async () => ({
      cadence: "daily" as const,
      summary: "",
    }));
    await step.run("persist-and-email", async () => synthesis);
    return synthesis;
  },
);

export const generateDigestWeekly = inngest.createFunction(
  { id: "generate-digest-weekly" },
  { cron: "0 8 * * 1" },
  async ({ step }) => {
    const synthesis = await step.run("ai-tier3-compose", async () => ({
      cadence: "weekly" as const,
      summary: "",
    }));
    await step.run("persist-and-email", async () => synthesis);
    return synthesis;
  },
);
