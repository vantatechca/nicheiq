import { not, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";
import { and, desc, eq, ilike, isNotNull, isNull, lt, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { excludeSeedsClause, shouldIncludeSeeds } from "@/lib/db/seed-filter";

/**
 * `view` query param controls the split between products YOU launched and
 * market products crawled/promoted from signals. Encoded via the
 * presence of opportunity_id:
 *
 *   - mine   → opportunity_id IS NOT NULL  (launched by you)
 *   - market → opportunity_id IS NULL      (everything else — crawled, promoted)
 *   - all (or absent) → no filter
 *
 * This is what makes /products useful as a portfolio view — without it,
 * your single launched product gets lost in 80+ crawled market rows.
 *
 * The "market" name (vs "competitors") avoids confusion with the
 * /competitors sidebar page, which is a different lens — per-creator
 * playbook view, not per-product catalog.
 */
type ProductView = "mine" | "market" | "all";
function parseView(raw: string | null): ProductView {
  if (raw === "mine" || raw === "market") return raw;
  return "all";
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const niche = sp.get("niche");
  const platform = sp.get("sourcePlatform");
  const q = sp.get("q");
  const view = parseView(sp.get("view"));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25)));
  const cursor = sp.get("cursor") ?? undefined;

  const db = getDb();
  const conditions: SQL[] = [];

  // Hide seeded mock rows from list endpoints by default. Real data
  // (launched/promoted products) uses different id shapes and stays
  // visible. Override with ?includeSeeds=1 for debugging.
  const includeSeeds = shouldIncludeSeeds(req.nextUrl);
  conditions.push(...excludeSeedsClause(products.id, includeSeeds));

  // View split — see ProductView type for semantics.
  if (view === "mine") conditions.push(isNotNull(products.opportunityId));
  else if (view === "market") conditions.push(isNull(products.opportunityId));

  if (niche)
    conditions.push(eq(products.niche, niche as (typeof products.niche.enumValues)[number]));
  if (platform)
    conditions.push(
      eq(products.sourcePlatform, platform as (typeof products.sourcePlatform.enumValues)[number]),
    );
  if (q) conditions.push(ilike(products.title, `%${q}%`));

  // Keyset pagination on est_monthly_revenue_high desc (highest earners first).
  // Cursor format: "<revenueHigh>:<id>"
  if (cursor) {
    const [cursorValue, cursorId] = cursor.split(":");
    if (cursorValue && cursorId) {
      conditions.push(lt(products.estMonthlyRevenueHigh, Number(cursorValue)));
    }
  }

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = `${last.estMonthlyRevenueHigh ?? 0}:${last.id}`;
  }

  return ok({ products: items }, { nextCursor, total: null });
}
