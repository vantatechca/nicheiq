import { inngest } from "../client";

/** flippa.scan — daily, pull new digital-product listings under price threshold. */
export const scanFlippa = inngest.createFunction(
  { id: "scan-flippa" },
  { cron: "0 12 * * *" },
  async ({ step }) => {
    const listings = await step.run("fetch-flippa-listings", async () => ({ listings: 0 }));
    await step.run("persist-resellable-assets", async () => listings);
    return listings;
  },
);
