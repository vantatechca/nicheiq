import { NextRequest } from "next/server";
import { and, desc, eq, ilike, isNotNull, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
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

  // Mirror the SSR query's price cap so the Load-more cursor stream stays
  // consistent with what the user already sees. Defaults match the SSR
  // (5..300 clamp, 200 default).
  const rawMaxPrice = sp.get("maxPrice");
  const maxPrice =
    rawMaxPrice != null
      ? Math.max(5, Math.min(300, Number(rawMaxPrice) || 200))
      : null;

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
  if (maxPrice != null) {
    // COALESCE so launched products with null priceUsd aren't filtered out
    // by accident — matches the SSR query in page.tsx.
    conditions.push(lte(sql`COALESCE(${products.priceUsd}, 0)`, maxPrice));
  }

  // Keyset cursor with id tiebreaker. Format: "<revenueHigh>:<id>".
  //
  // Previously this only filtered on estMonthlyRevenueHigh via `lt(col, val)`,
  // which is unstable: products tied at the cursor's revenue sit exactly on
  // the page boundary and either duplicate (end of page N + start of page N+1)
  // or get skipped. Crawled rows routinely share revenue estimates (rev:0,
  // ratings-proxy clusters), so this misfired often.
  //
  // The correct predicate is "row is strictly less in the sort dimension OR
  // same sort value with strictly lower id". Paired with the existing
  // ORDER BY (estMonthlyRevenueHigh desc, id desc) every row lands on
  // exactly one page.
  if (cursor) {
    const [rawValue, cursorId] = cursor.split(":");
    if (rawValue && cursorId) {
      const cursorValue = Number(rawValue);
      const keyset = or(
        lt(products.estMonthlyRevenueHigh, cursorValue),
        and(eq(products.estMonthlyRevenueHigh, cursorValue), lt(products.id, cursorId)),
      );
      if (keyset) conditions.push(keyset);
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