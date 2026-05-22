// Server Component — fetches and filters opportunities at request time
// via Drizzle. All filter/sort/search state lives in URL params, so
// navigating with different params re-runs this component with new
// data. No client-side useEffect, no fetch waterfall.

import { and, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
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
  const sort = (sp.sort as "score" | "newest" | "revenue") ?? "newest";

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

  // Sort
  const orderBy =
    sort === "newest"
      ? [desc(opportunities.createdAt), desc(opportunities.id)]
      : sort === "revenue"
        ? [desc(opportunities.projectedRevenueUsd), desc(opportunities.id)]
        : [desc(opportunities.score), desc(opportunities.id)];

  // Fetch filtered rows + total count in parallel.
  // Two queries: the filtered listing (what the user sees) and a stable total
  // (number of opportunities in the DB, used in "30 of 30 ranked" caption).
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(opportunities)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(200),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(opportunities),
  ]);

  const total = totalRow[0]?.count ?? 0;

  return (
    <OpportunitiesView
      opportunities={rows as never[]}
      total={total}
      filters={{ niche, type, effort, status, minScore, search, sort }}
    />
  );
}
