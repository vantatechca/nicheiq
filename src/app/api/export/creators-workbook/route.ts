import { NextRequest } from "next/server";
import { and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { excludeSeedsClause } from "@/lib/db/seed-filter";
import { buildCreatorWorkbook, type CreatorRow } from "@/lib/export/creator-workbook";

// exceljs needs the Node runtime (Buffer/streams) — not edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/creators-workbook
 *
 * Database 3, the boss-ready Excel deliverable: the sellers behind the winners.
 * One .xlsx with three sheets — Top Creators, All Creators (by revenue), and a
 * By Niche scoreboard. Matches the Products / Opportunities workbook styling.
 *
 * Real creators only (seeds excluded). Populate the table first by running the
 * creator roll-up (src/lib/creators/rollup.ts) over crawled products.
 */
const MAX_ROWS = 10_000;

export async function GET(_req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const db = getDb();

  const rows = await db
    .select({
      handle: creators.handle,
      displayName: creators.displayName,
      platform: creators.sourcePlatform,
      productCount: creators.productCount,
      totalRevenue: creators.totalEstRevenueUsd,
      niches: creators.niches,
      profileUrl: creators.profileUrl,
    })
    .from(creators)
    .where(and(...excludeSeedsClause(creators.id, false)))
    .orderBy(desc(creators.totalEstRevenueUsd), desc(creators.id))
    .limit(MAX_ROWS);

  const mapped: CreatorRow[] = rows.map((r) => ({
    handle: r.handle,
    displayName: r.displayName,
    platform: r.platform,
    productCount: r.productCount,
    totalRevenue: Math.round(r.totalRevenue),
    niches: r.niches,
    profileUrl: r.profileUrl,
  }));

  const buf = await buildCreatorWorkbook(mapped);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="nicheiq-creators-database-${stamp}.xlsx"`,
    },
  });
}