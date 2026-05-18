import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { opportunities, products, sourcePlatformEnum } from "@/lib/db/schema";
import { ok, notFound, badRequest, unauthorized, created } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

/**
 * "Launch" an opportunity — graduate it from a planning artifact into a
 * tracked product in YOUR portfolio.
 *
 * This is the moment an opportunity stops being a bet and becomes a thing
 * you shipped. We:
 *   1. Insert a row into `products` with opportunityId = opp.id and
 *      creator = the launching user, so the product is tagged as yours.
 *   2. Flip opp.status to "launched" so the dashboard reflects it.
 *
 * The operation is idempotent: if there's already a product linked to
 * this opportunity, we return that instead of creating a duplicate.
 * That makes it safe for the UI to retry or for a user to fire it
 * twice.
 */

const launchSchema = z.object({
  launchUrl: z.string().url().max(500),
  sourcePlatform: z.enum(sourcePlatformEnum.enumValues),
  title: z.string().min(2).max(200).optional(),
  priceUsd: z.number().nonnegative().max(1_000_000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const userId = (session.user as { id?: string }).id ?? session.user?.email ?? "anon";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = launchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid body", parsed.error.flatten());

  const db = getDb();

  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, params.id))
    .limit(1);
  if (!opp) return notFound("Opportunity not found");

  // Idempotency: if a product already exists for this opportunity, return
  // it. The status update is also a no-op if the opp is already launched.
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.opportunityId, params.id))
    .limit(1);

  if (existing) {
    // Make sure the opp status is consistent with reality.
    if (opp.status !== "launched") {
      await db
        .update(opportunities)
        .set({ status: "launched", updatedAt: new Date() })
        .where(eq(opportunities.id, params.id));
    }
    return ok({
      product: existing,
      opportunity: { ...opp, status: "launched" },
      alreadyLaunched: true,
    });
  }

  const now = new Date();
  const productId = `product_launch_${opp.id}_${Date.now()}`;

  const [product] = await db
    .insert(products)
    .values({
      id: productId,
      opportunityId: opp.id,
      sourcePlatform: parsed.data.sourcePlatform,
      sourceUrl: parsed.data.launchUrl,
      title: parsed.data.title ?? opp.title,
      creator: userId,
      creatorId: null,
      priceUsd: parsed.data.priceUsd ?? null,
      currency: "USD",
      ratingAvg: null,
      ratingCount: null,
      estMonthlySalesLow: null,
      estMonthlySalesHigh: null,
      estMonthlyRevenueLow: null,
      // Seed the high estimate from the opp's projection so /products
      // sorts and surfaces the launch reasonably from day one.
      estMonthlyRevenueHigh: opp.projectedRevenueUsd,
      niche: opp.niche,
      tags: [],
      thumbnailUrl: null,
      rawJson: { launchedFromOpportunityId: opp.id, launchedBy: userId },
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .returning();

  // Flip status. We also update updatedAt so the opp re-sorts to the top
  // of "recently changed" views.
  const [updatedOpp] = await db
    .update(opportunities)
    .set({ status: "launched", updatedAt: now })
    .where(eq(opportunities.id, params.id))
    .returning();

  return created({ product, opportunity: updatedOpp, alreadyLaunched: false });
}
