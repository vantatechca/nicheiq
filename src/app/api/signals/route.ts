import { NextRequest } from "next/server";
import { and, desc, eq, lt, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { signals } from "@/lib/db/schema";
import { ok, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const niche = sp.get("niche");
  const signalType = sp.get("type");
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 50)));
  const cursor = sp.get("cursor") ?? undefined;

  const db = getDb();
  const conditions: SQL[] = [];

  if (niche) conditions.push(eq(signals.niche, niche as (typeof signals.niche.enumValues)[number]));
  if (signalType)
    conditions.push(
      eq(signals.signalType, signalType as (typeof signals.signalType.enumValues)[number]),
    );

  // Keyset on score desc, then processedAt desc as tiebreaker for stable ordering.
  // Cursor format: "<score>:<processedAt-iso>:<id>"
  if (cursor) {
    const parts = cursor.split(":");
    const cursorScore = parts[0];
    if (cursorScore) conditions.push(lt(signals.score, Number(cursorScore)));
  }

  const rows = await db
    .select()
    .from(signals)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(signals.processedAt), desc(signals.score), desc(signals.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = `${last.score}:${last.processedAt.toISOString()}:${last.id}`;
  }

  return ok({ signals: items }, { nextCursor, total: null });
}
