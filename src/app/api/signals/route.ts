import { NextRequest } from "next/server";
import { and, desc, eq, lt, or, type SQL } from "drizzle-orm";
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

  // Keyset cursor on (processedAt desc, score desc, id desc) — matches the
  // ORDER BY exactly. Cursor format: "<processedAtMs>:<score>:<id>".
  //
  // Two bugs in the previous version:
  //   1. The cursor was encoded "<score>:<processedAt-iso>:<id>" but the WHERE
  //      only filtered on score with `lt(signals.score, ...)`. Since ORDER BY
  //      leads with processedAt, the cursor was filtering the WRONG sort
  //      dimension — paging produced effectively random subsets.
  //   2. The ISO timestamp contained colons (e.g. 2024-05-28T14:30:00.000Z),
  //      so splitting the cursor by ":" gave 5+ parts and broke parsing.
  //
  // Fix: encode processedAt as epoch ms (no colons), match the WHERE to the
  // ORDER BY via the standard 3-level keyset comparison: row strictly earlier
  // OR same timestamp with lower score OR same timestamp+score with lower id.
  //
  // Breaking URL contract: any stored cursor from before this fix won't parse
  // cleanly. That's fine — the old cursors weren't producing reliable results
  // anyway, so no client could have been relying on the page-N behavior.
  if (cursor) {
    const [rawMs, rawScore, cursorId] = cursor.split(":");
    if (rawMs && rawScore && cursorId) {
      const cursorMs = Number(rawMs);
      const cursorScore = Number(rawScore);
      if (Number.isFinite(cursorMs) && Number.isFinite(cursorScore)) {
        const cursorTs = new Date(cursorMs);
        const keyset = or(
          lt(signals.processedAt, cursorTs),
          and(eq(signals.processedAt, cursorTs), lt(signals.score, cursorScore)),
          and(
            eq(signals.processedAt, cursorTs),
            eq(signals.score, cursorScore),
            lt(signals.id, cursorId),
          ),
        );
        if (keyset) conditions.push(keyset);
      }
    }
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
    nextCursor = `${last.processedAt.getTime()}:${last.score}:${last.id}`;
  }

  return ok({ signals: items }, { nextCursor, total: null });
}