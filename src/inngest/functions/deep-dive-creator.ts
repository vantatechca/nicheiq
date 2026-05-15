import { inngest } from "../client";
import { getDb } from "@/lib/db/client";
import { creators, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { selectModel } from "@/lib/ai/client";

export const deepDiveCreator = inngest.createFunction(
  { id: "deep-dive-creator", name: "Deep Dive Creator", retries: 2 },
  { event: "nicheiq/creator.deep-dive.requested" },
  async ({ event, step, logger }) => {
    const { creatorId } = event.data as { creatorId: string };

    const result = await step.run("analyze-and-persist", async () => {
      const db = getDb();

      const [creator] = await db.select().from(creators).where(eq(creators.id, creatorId)).limit(1);
      if (!creator) throw new Error(`Creator ${creatorId} not found`);

      const creatorProducts = await db
        .select()
        .from(products)
        .where(eq(products.creatorId, creatorId))
        .limit(20);

      const productList = creatorProducts
        .map(
          (p, i) =>
            `${i + 1}. "${p.title}" — ${p.niche.replace(/_/g, " ")} — $${p.priceUsd ?? "?"} — ${p.estMonthlySalesHigh ?? 0} sales/mo est.`,
        )
        .join("\n");

      const tier3 = selectModel({ tier: 3 });
      const { text } = await tier3.complete({
        system: `You are a digital product market analyst. Output ONLY valid JSON, no markdown.`,
        messages: [
          {
            role: "user",
            content: `Creator: ${creator.displayName} (@${creator.handle})
Platform: ${creator.sourcePlatform.replace(/_/g, " ")}
Followers: ${creator.followerCount?.toLocaleString() ?? "unknown"}
Products: ${productList || "None tracked."}

Output their playbook as JSON:
{
  "pricingTiers": [{"label": "...", "priceUsd": 0}],
  "postingCadence": "...",
  "topTags": ["..."],
  "funnels": ["..."],
  "signatureStyle": "..."
}`,
          },
        ],
        maxTokens: 600,
        temperature: 0.3,
      });

      let playbook = {};
      try {
        const cleaned = text
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/, "")
          .trim();
        playbook = JSON.parse(cleaned);
      } catch {
        playbook = { signatureStyle: text.slice(0, 500) };
      }

      await db
        .update(creators)
        .set({ playbook, lastEnrichedAt: new Date() })
        .where(eq(creators.id, creatorId));

      logger.info(`[deep-dive-creator] playbook generated for ${creatorId}`);
      return { creatorId, status: "complete" };
    });

    return result;
  },
);
