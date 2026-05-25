import { NextRequest } from "next/server";
import { and, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { excludeSeedsClause, shouldIncludeSeeds } from "@/lib/db/seed-filter";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const platform = sp.get("sourcePlatform");
  const q = sp.get("q");
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25)));
  const cursor = sp.get("cursor") ?? undefined;

  const db = getDb();
  const conditions: SQL[] = [];

  // Hide seeded mock creators by default (same behavior as /products and
  // /opportunities, and matching the creators-workbook export). Opt out with
  // ?includeSeeds=1.
  conditions.push(...excludeSeedsClause(creators.id, shouldIncludeSeeds(req.nextUrl)));

  if (platform)
    conditions.push(
      eq(creators.sourcePlatform, platform as (typeof creators.sourcePlatform.enumValues)[number]),
    );
  if (q) {
    const needle = `%${q}%`;
    const textMatch = or(ilike(creators.displayName, needle), ilike(creators.handle, needle));
    if (textMatch) conditions.push(textMatch);
  }

  // Keyset on total revenue desc (top earners first).
  // Cursor format: "<totalRevenue>:<handle>" (handle is the tiebreaker since
  // there's no single id column visible; if there is one, swap it in).
  if (cursor) {
    const [cursorValue, cursorTie] = cursor.split(":");
    if (cursorValue && cursorTie) {
      conditions.push(lt(creators.totalEstRevenueUsd, Number(cursorValue)));
    }
  }

  const rows = await db
    .select()
    .from(creators)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(creators.totalEstRevenueUsd), desc(creators.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = `${last.totalEstRevenueUsd}:${last.id}`;
  }

  return ok({ creators: items }, { nextCursor, total: null });
}