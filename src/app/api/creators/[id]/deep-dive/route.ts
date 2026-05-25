import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { competitors, creators, products } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { selectModel } from "@/lib/ai/client";
import { CREATOR_PLAYBOOK_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  const [creator] = await db.select().from(creators).where(eq(creators.id, params.id)).limit(1);
  if (!creator) return notFound("Creator not found");

  const creatorProducts = await db
    .select()
    .from(products)
    .where(eq(products.creatorId, params.id))
    .limit(20);

  const productList = creatorProducts
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" — ${p.niche.replace(/_/g, " ")} — $${p.priceUsd ?? "?"} — ${p.estMonthlySalesHigh ?? 0} sales/mo est.`,
    )
    .join("\n");

  const tier3 = selectModel({ tier: 3 });

  const { text } = await tier3.complete({
    system: CREATOR_PLAYBOOK_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Creator: ${creator.displayName} (@${creator.handle})
Platform: ${creator.sourcePlatform.replace(/_/g, " ")}
Followers: ${creator.followerCount?.toLocaleString() ?? "unknown"}
Products (${creatorProducts.length}):
${productList || "No products tracked yet."}

Output their playbook as JSON:
{
  "pricingTiers": [{"label": "Entry", "priceUsd": 9}, {"label": "Core", "priceUsd": 29}, {"label": "Premium", "priceUsd": 79}],
  "postingCadence": "2-3 products per month",
  "topTags": ["tag1", "tag2"],
  "funnels": ["funnel1"],
  "signatureStyle": "description of their style"
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
    .where(eq(creators.id, params.id));

  // A deep dive *is* adding the creator to the deep watchlist — track them as
  // a competitor using the playbook we just generated. No unique index on
  // creatorId, so check first; refresh the playbook on a repeat dive rather
  // than creating duplicates.
  const [existingComp] = await db
    .select({ id: competitors.id })
    .from(competitors)
    .where(eq(competitors.creatorId, params.id))
    .limit(1);

  if (existingComp) {
    await db
      .update(competitors)
      .set({ playbook, depth: "deep", lastReviewedAt: new Date() })
      .where(eq(competitors.id, existingComp.id));
  } else {
    await db.insert(competitors).values({
      id: `comp_${Date.now()}`,
      creatorId: params.id,
      depth: "deep",
      playbook,
      notes: "",
      lastReviewedAt: new Date(),
    });
  }

  return ok({ playbook, tracked: true });
}