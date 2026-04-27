import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "nicheiq",
  name: "NicheIQ",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type Events = {
  "crawl/source.requested": { data: { sourceId: string; runId?: string } };
  "product/enrich.requested": { data: { productId: string } };
  "opportunity/score.requested": { data: { opportunityId: string } };
  "opportunity/synthesize.batch": { data: {} };
  "digest/generate.requested": { data: { cadence: "daily" | "weekly" | "monthly" } };
  "trend/snapshot.daily": { data: {} };
  "patterns/refresh.nightly": { data: {} };
  "flippa/scan.daily": { data: {} };
};
