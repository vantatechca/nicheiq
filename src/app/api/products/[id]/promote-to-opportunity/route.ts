import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities, products } from "@/lib/db/schema";
import { notFound, unauthorized, created } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  const db = getDb();

  // Look up the source product.
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .limit(1);
  if (!product) return notFound("Product not found");

  // Build a replication-type opportunity from the product. Score starts at 60
  // (above threshold for "tracking") — Inngest score-opportunity will refine
  // this later with full rationale + golden-rule modifiers.
  const newOppId = `opp_from_${product.id}_${Date.now()}`;
  const [opportunity] = await db
    .insert(opportunities)
    .values({
      id: newOppId,
      title: `Replicate: ${product.title}`,
      summary: `Replication candidate sourced from ${product.creator ?? "unknown"} on ${product.sourcePlatform}.`,
      niche: product.niche,
      opportunityType: "replication",
      buildEffort: "weekend",
      projectedRevenueUsd: product.estMonthlyRevenueHigh ?? 1000,
      status: "tracking",
      sourceProductIds: [product.id],
      sourceSignalIds: [],
      aiRationale: `Replication candidate — top creator on ${product.sourcePlatform}. Pending AI synthesis.`,
      aiBuildPlan: {
        weeks: [],
        stack: [],
        risks: [],
        monetization: [],
        successMetrics: [],
      },
      score: 60,
      scoreBreakdown: {
        dimensions: {
          demand: { value: 60, weight: 0.25 },
          competition: { value: 50, weight: 0.2 },
          revenue: { value: 60, weight: 0.25 },
          buildEffort: { value: 70, weight: 0.15 },
          trend: { value: 50, weight: 0.15 },
        },
        ruleModifiers: [],
        patternModifiers: [],
        finalScore: 60,
        computedAt: new Date().toISOString(),
      },
      createdBy: userId,
    })
    .returning();

  return created({ opportunity });
}