import { and, desc, eq, gte, lt, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { signals } from "@/lib/db/schema";
import { mockSignals } from "@/mock/data";
import { isMockMode } from "./mode";

export interface ListSignalsOpts {
  niche?: string;
  type?: string;
  minScore?: number;
  cursor?: string;
  limit?: number;
}

export interface ListSignalsResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number | null;
}

/**
 * List signals for the feed, newest first.
 *
 * Mock mode keeps its original offset-string cursor (e.g. "25", "50") since
 * it paginates over an in-memory array — offset is cheap there.
 *
 * Live mode now uses KEYSET pagination on (processedAt desc, id desc). The
 * previous live implementation used `.offset(offset).limit(limit+1)`, which
 * api/response.ts explicitly warns against: offset scales linearly with the
 * page number (Postgres must read+discard `offset` rows every page) and can
 * skip or duplicate rows under concurrent inserts (the dominant write
 * pattern here — crawlers persist signals on cron).
 *
 * The two cursor formats don't collide because they only travel round-trip
 * within one mode (mock cursors only come from mock pages and vice versa).
 * A keyset cursor starts with epoch ms (a long integer), so the live parser
 * rejects offset-style cursors cleanly via Number.isFinite.
 */
export async function listSignals(opts: ListSignalsOpts) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));

  if (isMockMode()) {
    let rows = [...mockSignals].sort(
      (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime(),
    );
    if (opts.niche) rows = rows.filter((s) => s.niche === opts.niche);
    if (opts.type) rows = rows.filter((s) => s.signalType === opts.type);
    if (opts.minScore) rows = rows.filter((s) => s.score >= opts.minScore!);

    const start = opts.cursor ? Math.max(0, parseInt(opts.cursor, 10) || 0) : 0;
    const slice = rows.slice(start, start + limit);
    const nextCursor = start + slice.length < rows.length ? String(start + slice.length) : null;
    return { items: slice, nextCursor, total: rows.length };
  }

  const db = getDb();
  const conditions: SQL[] = [];
  if (opts.niche)
    conditions.push(eq(signals.niche, opts.niche as (typeof signals.niche.enumValues)[number]));
  if (opts.type)
    conditions.push(
      eq(signals.signalType, opts.type as (typeof signals.signalType.enumValues)[number]),
    );
  if (opts.minScore) conditions.push(gte(signals.score, opts.minScore));

  // Keyset cursor on (processedAt desc, id desc). Format: "<processedAtMs>:<id>".
  // The id tiebreaker matters: a single crawler batch persists many signals
  // sharing one processedAt timestamp, so without it the page boundary would
  // silently drop or duplicate signals from that batch.
  if (opts.cursor) {
    const [rawMs, cursorId] = opts.cursor.split(":");
    if (rawMs && cursorId) {
      const cursorMs = Number(rawMs);
      if (Number.isFinite(cursorMs)) {
        const cursorTs = new Date(cursorMs);
        const keyset = or(
          lt(signals.processedAt, cursorTs),
          and(eq(signals.processedAt, cursorTs), lt(signals.id, cursorId)),
        );
        if (keyset) conditions.push(keyset);
      }
    }
  }

  const rows = await db
    .select()
    .from(signals)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(signals.processedAt), desc(signals.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1]!;
    nextCursor = `${last.processedAt.getTime()}:${last.id}`;
  }

  // total stays null in live mode — counting separately is a wasted round-trip
  // for a feed view, and the keyset cursor already tells the UI whether more
  // pages exist via nextCursor.
  return { items, nextCursor, total: null };
}