// Server Component for /creators. Smaller than products — only two filters
// (search + platform). Sort is fixed to revenue desc (no sort UI).
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
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

  const db = getDb();

  const conditions: SQL[] = [];
  if (platform)
    conditions.push(
      eq(creators.sourcePlatform, platform as typeof creators.sourcePlatform.enumValues[number]),
    );
  if (search.trim()) {
    const needle = `%${search.trim()}%`;
    const textMatch = or(ilike(creators.displayName, needle), ilike(creators.handle, needle));
    if (textMatch) conditions.push(textMatch);
  }

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(creators)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(creators.totalEstRevenueUsd), desc(creators.id))
      .limit(200),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(creators),
  ]);

  const total = totalRow[0]?.count ?? 0;

  return (
    <CreatorsView
      creators={rows as never[]}
      total={total}
      filters={{ search, platform }}
    />
  );
}