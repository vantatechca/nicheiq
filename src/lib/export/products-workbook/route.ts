import { NextRequest } from "next/server";
import { and, desc, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { excludeSeedsClause } from "@/lib/db/seed-filter";
import { readRevenueBasis } from "@/lib/crawlers/revenue";
import { buildProductWorkbook, type ProductRow } from "@/lib/export/product-workbook";

// exceljs needs the Node runtime (Buffer/streams) — not edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/products-workbook
 *
 * Database 1, the boss-ready Excel deliverable: one .xlsx with three sheets —
 * Top Candidates, All Products (ranked by last seen), and a By Niche scoreboard.
 * Matches the Opportunities workbook styling exactly.
 *
 * Real market products only (seeds excluded, opportunity_id NULL = crawled
 * competitor winners, not your own launches). Like the opportunities workbook
 * it ignores UI filters on purpose — it's the complete picture.
 */
const MAX_ROWS = 10_000;

/** Representative single value from a low/high estimate range. */
function midpoint(low: number | null, high: number | null): number | null {
  if (low != null && high != null) return Math.round((low + high) / 2);
  if (high != null) return Math.round(high);
  if (low != null) return Math.round(low);
  return null;
}

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  const rows = await db
    .select({
      title: products.title,
      niche: products.niche,
      platform: products.sourcePlatform,
      salesLow: products.estMonthlySalesLow,
      salesHigh: products.estMonthlySalesHigh,
      revLow: products.estMonthlyRevenueLow,
      revHigh: products.estMonthlyRevenueHigh,
      tags: products.tags,
      firstSeenAt: products.firstSeenAt,
      lastSeenAt: products.lastSeenAt,
    })
    .from(products)
    .where(and(isNull(products.opportunityId), ...excludeSeedsClause(products.id, false)))
    .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.lastSeenAt), desc(products.id))
    .limit(MAX_ROWS);

  const mapped: ProductRow[] = rows.map((r) => ({
    title: r.title,
    niche: r.niche,
    platform: r.platform,
    sales: midpoint(r.salesLow, r.salesHigh),
    revenue: midpoint(r.revLow, r.revHigh),
    basis: readRevenueBasis(r.tags),
    firstSeenAt: r.firstSeenAt,
    lastSeenAt: r.lastSeenAt,
  }));

  const buf = await buildProductWorkbook(mapped);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nicheiq-products-database-${stamp}.xlsx"`,
    },
  });
}