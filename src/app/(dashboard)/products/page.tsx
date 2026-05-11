// Server Component for /products. Filtering happens server-side via Drizzle.
// URL params drive data-shaping; selection/dialog/hover state stays in the
// view client.
import { and, desc, eq, ilike, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { ProductsView } from "./products-view";

export const dynamic = "force-dynamic";

type SP = Promise<{
  niche?: string;
  platform?: string;
  q?: string;
  maxPrice?: string;
}>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const niche = sp.niche ?? null;
  const platform = sp.platform ?? null;
  const search = sp.q ?? "";
  // Coerce safely — clamp in case the URL has garbage.
  const maxPrice = Math.max(5, Math.min(300, Number(sp.maxPrice) || 200));

  const db = getDb();

  // Build WHERE conditions.
  const conditions: SQL[] = [];
  if (niche)
    conditions.push(
      eq(products.niche, niche as typeof products.niche.enumValues[number]),
    );
  if (platform)
    conditions.push(
      eq(products.sourcePlatform, platform as typeof products.sourcePlatform.enumValues[number]),
    );
  if (search.trim()) {
    conditions.push(ilike(products.title, `%${search.trim()}%`));
  }
  // Price filter — note priceUsd is nullable; COALESCE to 0 so nulls don't get
  // filtered out by accident (they were excluded above 0 by the old mock filter).
  conditions.push(lte(sql`COALESCE(${products.priceUsd}, 0)`, maxPrice));

  // Fetch filtered rows + total in parallel.
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.id))
      .limit(200),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(products),
  ]);

  const total = totalRow[0]?.count ?? 0;

  return (
    <ProductsView
      products={rows as never[]}
      total={total}
      filters={{ niche, platform, search, maxPrice }}
    />
  );
}