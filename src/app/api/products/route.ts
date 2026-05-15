import { NextRequest } from "next/server";
import { and, desc, eq, ilike, lt, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const niche = sp.get("niche");
  const platform = sp.get("sourcePlatform");
  const q = sp.get("q");
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25)));
  const cursor = sp.get("cursor") ?? undefined;

  const db = getDb();
  const conditions: SQL[] = [];

  if (niche)
    conditions.push(eq(products.niche, niche as (typeof products.niche.enumValues)[number]));
  if (platform)
    conditions.push(
      eq(products.sourcePlatform, platform as (typeof products.sourcePlatform.enumValues)[number]),
    );
  if (q) conditions.push(ilike(products.title, `%${q}%`));

  // Keyset pagination on est_monthly_revenue_high desc (highest earners first).
  // Cursor format: "<revenueHigh>:<id>"
  if (cursor) {
    const [cursorValue, cursorId] = cursor.split(":");
    if (cursorValue && cursorId) {
      conditions.push(lt(products.estMonthlyRevenueHigh, Number(cursorValue)));
    }
  }

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.estMonthlyRevenueHigh), desc(products.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = `${last.estMonthlyRevenueHigh ?? 0}:${last.id}`;
  }

  return ok({ products: items }, { nextCursor, total: null });
}
