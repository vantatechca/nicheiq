// Server Component — fetches and filters opportunities at request time
// via Drizzle. All filter/sort/search state lives in URL params, so
// navigating with different params re-runs this component with new
// data. No client-side useEffect, no fetch waterfall.
//
// Pagination: SSR returns the first PAGE_SIZE rows + an initialNextCursor.
// The client appends pages by calling /api/opportunities?cursor=... with the
// same filters. Cursor format depends on the active sort — see the
// `nextCursor` builder at the bottom of this file (and the API route for
// the matching parse logic).

import { and, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { OpportunitiesView } from "./opportunities-view";

export const dynamic = "force-dynamic";

/**
 * Initial page size for SSR. Client uses the same value when paging via
 * `/api/opportunities?cursor=...` so each Load-more click feels visually
 * consistent. Bump if you want a longer initial render.
 */
const PAGE_SIZE = 50;

type SortMode = "score" | "newest" | "revenue";

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
  const sort = (sp.sort as SortMode) ?? "newest";

  const db = getDb();

  // Build WHERE conditions. Each is type-checked against the enum at compile time.
  const conditions: SQL[] = [];
  if (niche)
    conditions.push(
      eq(opportunities.niche, niche as (typeof opportunities.niche.enumValues)[number]),
    );
  if (type)
    conditions.push(
      eq(
        opportunities.opportunityType,
        type as (typeof opportunities.opportunityType.enumValues)[number],
      ),
    );
  if (effort)
    conditions.push(
      eq(
        opportunities.buildEffort,
        effort as (typeof opportunities.buildEffort.enumValues)[number],
      ),
    );
  if (status)
    conditions.push(
      eq(opportunities.status, status as (typeof opportunities.status.enumValues)[number]),
    );
  if (minScore > 0) conditions.push(gte(opportunities.score, minScore));
  if (search.trim()) {
    const needle = `%${search.trim()}%`;
    const textMatch = or(ilike(opportunities.title, needle), ilike(opportunities.summary, needle));
    if (textMatch) conditions.push(textMatch);
  }

  // Sort — three modes, each with an id tiebreaker so the keyset cursor
  // (computed below) is stable across rows tied at the lead sort value.
  const orderBy =
    sort === "newest"
      ? [desc(opportunities.createdAt), desc(opportunities.id)]
      : sort === "revenue"
        ? [desc(opportunities.projectedRevenueUsd), desc(opportunities.id)]
        : [desc(opportunities.score), desc(opportunities.id)];

  // Fetch filtered rows + total count in parallel.
  // Two queries: the filtered listing (what the user sees) and a stable total
  // (number of opportunities in the DB, used in "30 of 30 ranked" caption).
  //
  // We fetch PAGE_SIZE+1 rows to detect a next page without a separate COUNT
  // on the filtered set: if the +1 row exists, build an initialNextCursor
  // from the last row of the trimmed slice. Same pattern the API uses.
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(opportunities)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(PAGE_SIZE + 1),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(opportunities),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  // Cursor format must match the API route's parser. Format depends on sort:
  //   newest  → "<createdAt-iso>:<id>"
  //   revenue → "<projectedRevenueUsd>:<id>"
  //   score   → "<score>:<id>"
  // Don't change without updating /api/opportunities/route.ts in lockstep.
  let initialNextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    if (sort === "newest") initialNextCursor = `${last.createdAt.toISOString()}:${last.id}`;
    else if (sort === "revenue") initialNextCursor = `${last.projectedRevenueUsd}:${last.id}`;
    else initialNextCursor = `${last.score}:${last.id}`;
  }

  const total = totalRow[0]?.count ?? 0;

  return (
    <OpportunitiesView
      opportunities={items as never[]}
      total={total}
      filters={{ niche, type, effort, status, minScore, search, sort }}
      initialNextCursor={initialNextCursor}
      pageSize={PAGE_SIZE}
    />
  );
}