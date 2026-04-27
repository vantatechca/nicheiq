import { inngest } from "../client";

/** enrich.product — Tier-2 (Haiku) enrichment per new product. */
export const enrichProduct = inngest.createFunction(
  { id: "enrich-product", retries: 2, concurrency: { limit: 4 } },
  { event: "product/enrich.requested" },
  async ({ event, step }) => {
    const { productId } = event.data;

    const enriched = await step.run("ai-tag-and-estimate", async () => {
      // Phase I: call Tier-2 client to extract niche, est. revenue, embedding.
      return { productId, tags: [] as string[], estimatedRevenue: 0 };
    });

    await step.run("store-embedding", async () => {
      // Phase I: pgvector insert
      return { stored: true };
    });

    return enriched;
  },
);
