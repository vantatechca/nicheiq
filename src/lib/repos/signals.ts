import { and, desc, eq, gte, type SQL } from "drizzle-orm";
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
 * List signals for the feed, newest first. Cursor is an offset string
 * (matches the protocol the client already speaks via offsetPaginate).
 *
 * Mock mode filters the in-memory array; live mode runs a Drizzle query
 * with the same predicates and offset+limit pagination. Returns `total`
 * only in mock mode — for the DB path, total would require a separate
 * COUNT and isn't worth the extra round-trip for a feed view.
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
    const nextCursor =
      start + slice.length < rows.length ? String(start + slice.length) : null;
    return { items: slice, nextCursor, total: rows.length };
  }

  const db = getDb();
  const conditions: SQL[] = [];
  if (opts.niche)
    conditions.push(
      eq(signals.niche, opts.niche as (typeof signals.niche.enumValues)[number]),
    );
  if (opts.type)
    conditions.push(
      eq(
        signals.signalType,
        opts.type as (typeof signals.signalType.enumValues)[number],
      ),
    );
  if (opts.minScore) conditions.push(gte(signals.score, opts.minScore));

  const offset = opts.cursor ? Math.max(0, parseInt(opts.cursor, 10) || 0) : 0;
  const rows = await db
    .select()
    .from(signals)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(signals.processedAt))
    .offset(offset)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(offset + items.length) : null;
  return { items, nextCursor, total: null };
}