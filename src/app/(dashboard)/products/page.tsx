// Server Component for /products. Filtering happens server-side; the view
// component receives the filtered list as props. URL params drive data-shaping;
// selection/dialog/hover state stays in the view client.

import { mockProducts } from "@/mock/data";
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

  let rows = mockProducts.slice();
  if (niche) rows = rows.filter((p) => p.niche === niche);
  if (platform) rows = rows.filter((p) => p.sourcePlatform === platform);
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((p) => p.title.toLowerCase().includes(q));
  }
  rows = rows.filter((p) => (p.priceUsd ?? 0) <= maxPrice);
  rows.sort((a, b) => (b.estMonthlyRevenueHigh ?? 0) - (a.estMonthlyRevenueHigh ?? 0));

  return (
    <ProductsView
      products={rows}
      total={mockProducts.length}
      filters={{ niche, platform, search, maxPrice }}
    />
  );
}