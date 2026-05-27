import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "nicheiq",
  name: "NicheIQ",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type Events = {
  "crawl/source.requested": {
    data: {
      sourceId?: string;
      platform?: string;
      config?: Record<string, unknown>;
      runId?: string;
    };
  };
  "product/enrich.requested": { data: { productId: string } };
  "opportunity/score.requested": { data: { opportunityId: string } };
  "opportunity/synthesize.batch": { data: { niche?: string } };
  "digest/generate.requested": { data: { cadence: "daily" | "weekly" | "monthly" } };
  "trend/snapshot.daily": { data: Record<string, never> };
  "patterns/refresh.nightly": { data: Record<string, never> };
  "flippa/scan.daily": { data: Record<string, never> };
};