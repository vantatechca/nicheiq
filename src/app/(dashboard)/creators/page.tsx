// Server Component for /creators. Smaller than products — only two filters
// (search + platform). Sort is fixed to revenue desc (no sort UI).

import { mockCreators } from "@/mock/data";
import { CreatorsView } from "./creators-view";

export const dynamic = "force-dynamic";

type SP = Promise<{
  q?: string;
  platform?: string;
}>;

export default async function CreatorsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  const search = sp.q ?? "";
  const platform = sp.platform ?? null;

  let rows = [...mockCreators];
  if (platform) rows = rows.filter((c) => c.sourcePlatform === platform);
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q),
    );
  }
  rows.sort((a, b) => b.totalEstRevenueUsd - a.totalEstRevenueUsd);

  return (
    <CreatorsView
      creators={rows}
      total={mockCreators.length}
      filters={{ search, platform }}
    />
  );
}