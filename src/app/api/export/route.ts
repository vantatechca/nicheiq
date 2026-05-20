import { NextRequest } from "next/server";
import { and, desc, eq, gte, lte, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { badRequest, unauthorized } from "@/lib/api/response";
import { searchQuerySchema } from "@/lib/utils/validation";
import { requireSession } from "@/lib/auth/session";

/**
 * GET /api/opportunities/export
 *
 * Exports the full filtered opportunity set as CSV — for building an external
 * database / spreadsheet. Accepts the SAME query params as GET /api/opportunities
 * (niche, status, type, buildEffort, minScore, maxScore, q, sort) so whatever
 * you've filtered to in the UI exports identically.
 *
 * Unlike the list endpoint, this is NOT paginated — it returns every matching
 * row. Capped at MAX_ROWS as a safety valve; raise if you need more.
 */
const MAX_ROWS = 10_000;

// Columns chosen for a database import: scalar fields only. The embedding
// vector, JSON build-plan, and score-breakdown blobs are intentionally omitted
// — they don't belong in a flat CSV. Array fields are joined with "|".
const COLUMNS = [
  "id",
  "title",
  "summary",
  "niche",
  "opportunityType",
  "buildEffort",
  "projectedRevenueUsd",
  "score",
  "status",
  "aiRationale",
  "sourceSignalIds",
  "createdBy",
  "createdAt",
  "updatedAt",
] as const;

/** RFC-4180 CSV cell: wrap in quotes if it contains comma, quote, or newline. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  let s: string;
  if (Array.isArray(value)) s = value.join("|");
  else if (value instanceof Date) s = value.toISOString();
  else s = String(value);
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = searchQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest("Invalid query", parsed.error.flatten());
  const q = parsed.data;

  const db = getDb();

  // Same WHERE construction as the list endpoint (minus cursor pagination).
  const conditions: SQL[] = [];
  if (q.niche)
    conditions.push(
      eq(opportunities.niche, q.niche as (typeof opportunities.niche.enumValues)[number]),
    );
  if (q.status)
    conditions.push(
      eq(opportunities.status, q.status as (typeof opportunities.status.enumValues)[number]),
    );
  if (q.type)
    conditions.push(
      eq(
        opportunities.opportunityType,
        q.type as (typeof opportunities.opportunityType.enumValues)[number],
      ),
    );
  if (q.buildEffort)
    conditions.push(
      eq(
        opportunities.buildEffort,
        q.buildEffort as (typeof opportunities.buildEffort.enumValues)[number],
      ),
    );
  if (q.minScore != null) conditions.push(gte(opportunities.score, q.minScore));
  if (q.maxScore != null) conditions.push(lte(opportunities.score, q.maxScore));
  if (q.q) {
    const needle = `%${q.q}%`;
    const textMatch = or(ilike(opportunities.title, needle), ilike(opportunities.summary, needle));
    if (textMatch) conditions.push(textMatch);
  }

  const orderBy = (() => {
    if (q.sort === "newest") return [desc(opportunities.createdAt), desc(opportunities.id)];
    if (q.sort === "revenue")
      return [desc(opportunities.projectedRevenueUsd), desc(opportunities.id)];
    return [desc(opportunities.score), desc(opportunities.id)];
  })();

  const rows = await db
    .select()
    .from(opportunities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...orderBy)
    .limit(MAX_ROWS);

  const header = COLUMNS.join(",");
  const body = rows
    .map((row) => COLUMNS.map((col) => csvCell((row as Record<string, unknown>)[col])).join(","))
    .join("\r\n");
  const csv = `${header}\r\n${body}`;

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opportunities-${stamp}.csv"`,
    },
  });
}