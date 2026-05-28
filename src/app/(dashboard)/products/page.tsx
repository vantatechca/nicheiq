// Server Component for /products. Filtering happens server-side via Drizzle.
// URL params drive data-shaping; selection/dialog/hover state stays in the
// view client.
import { and, desc, eq, ilike, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { excludeSeedsClause } from "@/lib/db/seed-filter";
import { ProductsView } from "./products-view";

export const dynamic = "force-dynamic";

/**
 * Initial page size for SSR. The client uses the same value when paging via
 * `/api/products?cursor=...` so each Load-more click feels consistent in
 * height. Keep it small enough that the first paint is fast and the user
 * doesn't have to scroll for ages before the first "Load more" appears.
 */
const PAGE_SIZE = 50;

/**
 * View modes:
 *   mine   → products launched by you (opportunity_id IS NOT NULL)
 *   market → crawled/promoted (opportunity_id IS NULL)
 *   all    → both
 *
 * Named "market" rather than "competitors" because /competitors is
 * already a separate sidebar page with a different (creator-playbook)
 * lens. Same word, different concept — easier to keep them distinct.
 *
 * Default is "all" so existing bookmarks/links keep working unchanged.
 */
type ViewMode = "mine" | "market" | "all";
function coerceView(raw: string | undefined): ViewMode {
  if (raw === "mine" || raw === "market") return raw;
  return "all";
}

type SP = Promise<{
  niche?: string;
  platform?: string;
  q?: string;
  maxPrice?: string;
  view?: string;
}>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const niche = sp.niche ?? null;
  const platform = sp.platform ?? null;
  const search = sp.q ?? "";
  const view = coerceView(sp.view);
  // Coerce safely — clamp in case the URL has garbage.
  const maxPrice = Math.max(5, Math.min(300, Number(sp.maxPrice) || 200));

  const db = getDb();

  // Base filters (excluding the view-mode toggle) — shared between the
  // rendered list query and the per-view count queries. Keeping them in
  // one array prevents drift between what the user sees and what the
  // toggle-label counts claim.
  const baseConditions: SQL[] = [];

  // Seed-filter parity with /api/products: if the API hides seeds by
  // default, the SSR initial page has to as well — otherwise the first 50
  // could include seed rows and Load-more would silently skip them on
  // page 2, producing an obvious visual jump. Both layers now agree.
  baseConditions.push(...excludeSeedsClause(products.id, false));

  if (niche)
    baseConditions.push(eq(products.niche, niche as (typeof products.niche.enumValues)[number]));
  if (platform)
    baseConditions.push(
      eq(products.sourcePlatform, platform as (typeof products.sourcePlatform.enumValues)[number]),
    );
  if (search.trim()) {
    baseConditions.push(ilike(products.title, `%${search.trim()}%`));
  }
  // Price filter — priceUsd is nullable; COALESCE to 0 so null-priced launches
  // (the user created without a price set) don't get filtered out by accident.
  baseConditions.push(lte(sql`COALESCE(${products.priceUsd}, 0)`, maxPrice));

  // Compose the list-query condition set (base + view toggle).
  const listConditions: SQL[] = [...baseConditions];
  if (view === "mine") listConditions.push(isNotNull(products.opportunityId));
  else if (view === "market") listConditions.push(isNull(products.opportunityId));

  // Fetch list + three counts in parallel. The counts power the toggle
  // labels — "Mine (1)" / "Market (80)" / "All (81)" — so the user
  // can see which view would have data before clicking it.
  //
  // We fetch PAGE_SIZE+1 rows to detect a next page without a separate
  // COUNT query: if the +1 row exists, build an initialNextCursor from
  // the last row of the trimmed slice and hand it to the client. Same
  // pattern the API route uses.
  const [rows, mineCountRow, marketCountRow] = await Promise.all([
    db
      .select()
      .from(products)
      .where(listConditions.length ? and(...listConditions) : undefined)
      .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.id))
      .limit(PAGE_SIZE + 1),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(...baseConditions, isNotNull(products.opportunityId))),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(...baseConditions, isNull(products.opportunityId))),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  let initialNextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    // Format matches the API route's cursor parser exactly:
    // "<estMonthlyRevenueHigh>:<id>". Don't change this without also
    // updating /api/products/route.ts.
    initialNextCursor = `${last.estMonthlyRevenueHigh ?? 0}:${last.id}`;
  }

  const mineCount = mineCountRow[0]?.count ?? 0;
  const marketCount = marketCountRow[0]?.count ?? 0;
  const total = mineCount + marketCount;

  return (
    <ProductsView
      products={items as never[]}
      total={total}
      counts={{ all: total, mine: mineCount, market: marketCount }}
      filters={{ niche, platform, search, maxPrice, view }}
      initialNextCursor={initialNextCursor}
      pageSize={PAGE_SIZE}
    />
  );
}