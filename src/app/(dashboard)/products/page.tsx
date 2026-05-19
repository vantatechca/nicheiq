// Server Component for /products. Filtering happens server-side via Drizzle.
// URL params drive data-shaping; selection/dialog/hover state stays in the
// view client.
import { and, desc, eq, ilike, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { ProductsView } from "./products-view";

export const dynamic = "force-dynamic";

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
  const [rows, mineCountRow, marketCountRow] = await Promise.all([
    db
      .select()
      .from(products)
      .where(listConditions.length ? and(...listConditions) : undefined)
      .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.id))
      .limit(200),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(...baseConditions, isNotNull(products.opportunityId))),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(...baseConditions, isNull(products.opportunityId))),
  ]);

  const mineCount = mineCountRow[0]?.count ?? 0;
  const marketCount = marketCountRow[0]?.count ?? 0;
  const total = mineCount + marketCount;

  return (
    <ProductsView
      products={rows as never[]}
      total={total}
      counts={{ all: total, mine: mineCount, market: marketCount }}
      filters={{ niche, platform, search, maxPrice, view }}
    />
  );
}
