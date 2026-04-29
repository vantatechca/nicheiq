// Server Component — fetches and filters opportunities at request time.
// All filter/sort/search state lives in URL params, so navigating with
// different params re-runs this component with new data. No client-side
// useEffect, no fetch waterfall.
//
// When you wire the real DB, replace `mockOpportunities` with a Drizzle
// query that applies the same filters server-side. The component contract
// (props passed to OpportunitiesView) doesn't change.

import { mockOpportunities } from "@/mock/data";
import { OpportunitiesView } from "./opportunities-view";

export const dynamic = "force-dynamic";

type SP = Promise<{
  niche?: string;
  type?: string;
  effort?: string;
  status?: string;
  minScore?: string;
  q?: string;
  sort?: string;
}>;

export default async function OpportunitiesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  const niche = sp.niche ?? null;
  const type = sp.type ?? null;
  const effort = sp.effort ?? null;
  const status = sp.status ?? null;
  const minScore = Number(sp.minScore ?? 0);
  const search = sp.q ?? "";
  const sort = (sp.sort as "score" | "newest" | "revenue") ?? "score";

  // Filter — same logic as the old client useMemo, but server-side. When you
  // move to Drizzle, replace this with chained .where() / .orderBy() calls.
  let rows = mockOpportunities.slice();
  if (niche) rows = rows.filter((o) => o.niche === niche);
  if (type) rows = rows.filter((o) => o.opportunityType === type);
  if (effort) rows = rows.filter((o) => o.buildEffort === effort);
  if (status) rows = rows.filter((o) => o.status === status);
  if (minScore > 0) rows = rows.filter((o) => o.score >= minScore);
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (o) => o.title.toLowerCase().includes(q) || o.summary.toLowerCase().includes(q),
    );
  }
  if (sort === "score") rows.sort((a, b) => b.score - a.score);
  else if (sort === "revenue") rows.sort((a, b) => b.projectedRevenueUsd - a.projectedRevenueUsd);
  else if (sort === "newest") rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <OpportunitiesView
      opportunities={rows}
      total={mockOpportunities.length}
      filters={{ niche, type, effort, status, minScore, search, sort }}
    />
  );
}