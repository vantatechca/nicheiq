import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { getTopOpportunities } from "@/lib/repos/opportunities";
import { getTopProducts } from "@/lib/repos/products";
import { isMockMode } from "@/lib/repos/mode";
import { getDb } from "@/lib/db/client";
import { digests } from "@/lib/db/schema";
import { mockDigests } from "@/mock/data";

/**
 * On-demand digest preview. Synthesizes a digest object from current top
 * opportunities + products. Does NOT persist or send email — use
 * `POST /api/digest` for the full AI-summarized, persisted, emailed flow.
 *
 * In mock mode this reads from the in-memory fixture so the digest page
 * renders something coherent before any data is crawled.
 */
export async function POST(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const [top, topProducts, historyCount] = await Promise.all([
    getTopOpportunities(5),
    getTopProducts(5),
    countDigests(),
  ]);

  const topProductsForDigest = topProducts.map((p) => ({
    id: p.id,
    title: p.title,
    revenue: p.estMonthlyRevenueHigh ?? 0,
  }));

  const digest = {
    id: `digest_${Date.now()}`,
    cadence: "on_demand" as const,
    periodStart: new Date(Date.now() - 86_400_000).toISOString(),
    periodEnd: new Date().toISOString(),
    topOpportunityIds: top.map((o) => o.id),
    risingNiches: [...new Set(top.map((o) => o.niche))],
    topProducts: topProductsForDigest,
    aiSummary: top.length
      ? `On-demand digest: ${top[0]!.title} leads. ${top.length} opportunities scored above 75 in the last day.`
      : `On-demand digest: no opportunities yet — once crawlers run, this view fills in.`,
    sentTo: [],
    createdAt: new Date().toISOString(),
  };

  return ok({ digest, history: historyCount });
}

async function countDigests(): Promise<number> {
  if (isMockMode()) return mockDigests.length;
  const db = getDb();
  // Cheap "do any exist" with a small fetch — true COUNT is overkill for
  // a UI badge. If the count needs to be exact later, swap for sql`count(*)`.
  const recent = await db
    .select({ id: digests.id })
    .from(digests)
    .orderBy(desc(digests.createdAt))
    .limit(50);
  return recent.length;
}