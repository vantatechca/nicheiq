import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creators, products } from "@/lib/db/schema";
import { ok, notFound, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { selectModel } from "@/lib/ai/client";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  const [creator] = await db.select().from(creators).where(eq(creators.id, params.id)).limit(1);
  if (!creator) return notFound("Creator not found");

  // Fetch creator's products
  const creatorProducts = await db
    .select()
    .from(products)
    .where(eq(products.creatorId, params.id))
    .limit(20);

  // Build prompt
  const productList = creatorProducts
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" — ${p.niche.replace(/_/g, " ")} — $${p.priceUsd ?? "?"} — ${p.estMonthlySalesHigh ?? 0} sales/mo est.`,
    )
    .join("\n");

  const tier3 = selectModel({ tier: 3 });

  const { text } = await tier3.complete({
    system: `You are a digital product market analyst reverse-engineering a creator's strategy.
Output ONLY valid JSON, no markdown fences.`,
    messages: [
      {
        role: "user",
        content: `Creator: ${creator.displayName} (@${creator.handle})
Platform: ${creator.sourcePlatform.replace(/_/g, " ")}
Followers: ${creator.followerCount?.toLocaleString() ?? "unknown"}
Products (${creatorProducts.length}):
${productList || "No products tracked yet."}

Analyze this creator and output their playbook:
{
  "pricingTiers": [
    { "label": "Entry", "priceUsd": 9 },
    { "label": "Core", "priceUsd": 29 },
    { "label": "Premium", "priceUsd": 79 }
  ],
  "postingCadence": "2-3 products per month, focused on seasonal trends",
  "topTags": ["notion", "productivity", "template"],
  "funnels": ["Free sample → paid upgrade", "Bundle upsell at checkout"],
  "signatureStyle": "Clean minimal design with detailed documentation"
}`,
      },
    ],
    maxTokens: 600,
    temperature: 0.3,
  });

  // Parse playbook
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

  // Persist to creator
  await db
    .update(creators)
    .set({
      playbook,
      lastEnrichedAt: new Date(),
    })
    .where(eq(creators.id, params.id));

  return ok({ playbook });
}
