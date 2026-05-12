import { inngest } from "../client";

export const deepDiveCreator = inngest.createFunction(
  { id: "deep-dive-creator", name: "Deep Dive Creator", retries: 2 },
  { event: "nicheiq/creator.deep-dive.requested" },
  async ({ event, step, logger }) => {
    const { creatorId } = event.data as { creatorId: string };
    logger.info(`[deep-dive-creator] starting for ${creatorId}`);
    // Full implementation wired to DB + AI in next phase
    return { creatorId, status: "complete" };
  },
);