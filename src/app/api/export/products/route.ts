import { NextRequest } from "next/server";
import { and, desc, eq, gte, ilike, isNull, isNotNull, lte, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { excludeSeedsClause, shouldIncludeSeeds } from "@/lib/db/seed-filter";
import { readRevenueBasis } from "@/lib/crawlers/revenue";

/**
 * GET /api/export/products
 *
 * Exports products as CSV — the companion to /api/export (opportunities).
 * This is the "Database 1 / proven winners" feed once marketplace crawlers
 * are populating the products table (see _persist-signals.ts routing).
 *
 * Plain filters (faithful export of whatever you've filtered to):
 *   niche, sourcePlatform, q, view (mine|market|all), includeSeeds
 *
 * Proven-winner filters (all optional; omit for an unfiltered export):
 *   minRevenue           est_monthly_revenue_high >= n
 *   minRatingCount       rating_count >= n
 *   maxDaysSinceLastSeen last_seen_at within the last n days   (still alive)
 *   minAgeDays           first_seen_at older than n days       (durable)
 *
 * For the boss's "build-many-stores" list, call:
 *   /api/export/products?view=market&minRevenue=2000&minRatingCount=25
 *     &maxDaysSinceLastSeen=21&minAgeDays=60
 *
 * Not paginated — returns every matching row up to MAX_ROWS.
 */
const MAX_ROWS = 10_000;

const COLUMNS = [
  "id",
  "title",
  "niche",
  "sourcePlatform",
  "sourceUrl",
  "creator",
  "priceUsd",
  "currency",
  "ratingAvg",
  "ratingCount",
  "estMonthlySalesLow",
  "estMonthlySalesHigh",
  "estMonthlyRevenueLow",
  "estMonthlyRevenueHigh",
  "revenueBasis",
  "firstSeenAt",
  "lastSeenAt",
  "daysSinceLastSeen",
  "ageDays",
  "opportunityId",
  "tags",
] as const;

/** RFC-4180 CSV cell. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  let s: string;
  if (Array.isArray(value)) s = value.join("|");
  else if (value instanceof Date) s = value.toISOString();
  else s = String(value);
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Whole days between `from` and now (floored, never negative). */
function daysAgo(from: Date | null): number | null {
  if (!from) return null;
  return Math.max(0, Math.floor((Date.now() - from.getTime()) / 86_400_000));
}

/** Parse a non-negative number query param, or null if absent/invalid. */
function num(sp: URLSearchParams, key: string): number | null {
  const raw = sp.get(key);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const db = getDb();
  const conditions: SQL[] = [];

  // Hide seeded mock rows by default (same behavior as /api/products).
  conditions.push(...excludeSeedsClause(products.id, shouldIncludeSeeds(req.nextUrl)));

  // View split — market = crawled/promoted (opportunity_id NULL), mine = launched.
  const view = sp.get("view");
  if (view === "market") conditions.push(isNull(products.opportunityId));
  else if (view === "mine") conditions.push(isNotNull(products.opportunityId));

  const niche = sp.get("niche");
  if (niche)
    conditions.push(eq(products.niche, niche as (typeof products.niche.enumValues)[number]));

  const platform = sp.get("sourcePlatform");
  if (platform)
    conditions.push(
      eq(products.sourcePlatform, platform as (typeof products.sourcePlatform.enumValues)[number]),
    );

  const q = sp.get("q");
  if (q) conditions.push(ilike(products.title, `%${q}%`));

  // Proven-winner filters.
  const minRevenue = num(sp, "minRevenue");
  if (minRevenue != null) conditions.push(gte(products.estMonthlyRevenueHigh, minRevenue));

  const minRatingCount = num(sp, "minRatingCount");
  if (minRatingCount != null) conditions.push(gte(products.ratingCount, minRatingCount));

  const maxDaysSinceLastSeen = num(sp, "maxDaysSinceLastSeen");
  if (maxDaysSinceLastSeen != null) {
    const cutoff = new Date(Date.now() - maxDaysSinceLastSeen * 86_400_000);
    conditions.push(gte(products.lastSeenAt, cutoff)); // seen since cutoff = still alive
  }

  const minAgeDays = num(sp, "minAgeDays");
  if (minAgeDays != null) {
    const cutoff = new Date(Date.now() - minAgeDays * 86_400_000);
    conditions.push(lte(products.firstSeenAt, cutoff)); // first seen before cutoff = durable
  }

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.lastSeenAt), desc(products.id))
    .limit(MAX_ROWS);

  const enriched = rows.map((row) => ({
    ...row,
    // sales-derived | favorites-proxy | ratings-proxy | unknown — tells the
    // reader how much to trust the revenue figure for each row.
    revenueBasis: readRevenueBasis(row.tags),
    daysSinceLastSeen: daysAgo(row.lastSeenAt),
    ageDays: daysAgo(row.firstSeenAt),
  }));

  const header = COLUMNS.join(",");
  const body = enriched
    .map((row) => COLUMNS.map((col) => csvCell((row as Record<string, unknown>)[col])).join(","))
    .join("\r\n");
  const csv = `${header}\r\n${body}`;

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${stamp}.csv"`,
    },
  });
}